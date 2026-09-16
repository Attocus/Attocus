import os
import io
import math
import glob
import logging
from typing import List, Dict, Any, Optional, Union, BinaryIO, cast
from datetime import datetime, timezone

from pypdf import PdfReader
from openai import OpenAI

try:
    from services.observability import wrap_client
except Exception:
    try:
        from backend.services.observability import wrap_client
    except Exception:
        wrap_client = lambda c: c  # type: ignore

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter  # type: ignore
except ImportError:
    # Fallback simple recursive splitter if not installed
    class RecursiveCharacterTextSplitter:  # type: ignore
        def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 150):
            self.chunk_size = chunk_size
            self.chunk_overlap = chunk_overlap

        def split_text(self, text: str) -> List[str]:
            if not text:
                return []
            chunks = []
            start = 0
            while start < len(text):
                end = start + self.chunk_size
                chunks.append(text[start:end])
                start += self.chunk_size - self.chunk_overlap
            return chunks

try:
    from google.cloud import firestore  # type: ignore
    from google.cloud.firestore_v1.vector import Vector
    from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
    HAS_FIRESTORE = True
except ImportError:
    HAS_FIRESTORE = False
    firestore = None  # type: ignore
    Vector = None  # type: ignore
    DistanceMeasure = None  # type: ignore

logger = logging.getLogger("AttocusRAG")
logger.setLevel(logging.INFO)


class SharedRAGService:
    """
    Shared RAG Service for Attocus.
    
    Provides:
    - Centralized Firestore connection for vector embeddings.
    - PDF ingestion (reading, chunking with RecursiveCharacterTextSplitter).
    - Embedding with OpenAI 'text-embedding-3-small'.
    - Vector search using Firestore's native find_nearest with COSINE distance.
    - Shared context retrieval for all agents (Orchestrator, Quiz, Learning, Summary).
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        firebase_credentials_path: Optional[str] = None,
        collection_name: str = "pdf_embeddings"
    ):
        self.openai_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
        self.client = wrap_client(OpenAI(api_key=self.openai_key))
        self.collection_name = collection_name
        self.embedding_model = "text-embedding-3-small"
        
        # Local in-memory store for fallback or local sessions
        self._memory_chunks: List[Dict[str, Any]] = []
        
        # Initialize Firestore
        self.db = None
        self.collection_ref = None
        self.firebase_credentials_path = firebase_credentials_path
        self._init_firestore(firebase_credentials_path)

    def _find_service_account_file(self) -> Optional[str]:
        """Auto-detects Firebase service account JSON file from env or workspace."""
        candidates = [
            os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY"),
            os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
            os.environ.get("FIREBASE_CREDENTIALS_PATH"),
        ]
        for c in candidates:
            if c and os.path.isfile(c):
                return c

        # Scan workspace directories for service account JSON
        search_dirs = [
            os.getcwd(),
            os.path.join(os.getcwd(), "backend"),
            os.path.dirname(os.path.abspath(__file__)),
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ]

        patterns = [
            "*serviceAccount*.json",
            "*firebase*.json",
            "serviceAccountKey.json",
            "firebase-adminsdk*.json"
        ]

        for s_dir in set(search_dirs):
            for pat in patterns:
                matches = glob.glob(os.path.join(s_dir, pat))
                for m in matches:
                    if os.path.isfile(m) and not m.endswith("package.json") and not m.endswith("tsconfig.json"):
                        return m
        return None

    def _init_firestore(self, creds_path: Optional[str] = None):
        """Initializes Firestore Client and sets up the collection."""
        if not HAS_FIRESTORE or firestore is None:
            print("[RAG] google-cloud-firestore not installed. Using in-memory vector storage.")
            return

        resolved_path = creds_path or self._find_service_account_file()

        try:
            if resolved_path and os.path.isfile(resolved_path):
                print(f"[RAG] Connecting to Firestore using service account: {resolved_path}")
                self.db = firestore.Client.from_service_account_json(resolved_path)
            else:
                # Try default credentials
                try:
                    self.db = firestore.Client()
                    print("[RAG] Connected to Firestore with default credentials.")
                except Exception:
                    print(
                        "[RAG] No Firebase service account found. "
                        "Running in local hybrid mode (in-memory embeddings). "
                        "To connect Firestore, set FIREBASE_SERVICE_ACCOUNT_KEY in .env."
                    )
                    self.db = None

            if self.db:
                self.collection_ref = self.db.collection(self.collection_name)
                print(f"[RAG] Firestore collection '{self.collection_name}' ready for Vector RAG!")
        except Exception as err:
            print(f"[RAG] Warning: Failed to connect to Firestore: {err}. Using in-memory fallback.")
            self.db = None

    def embed_query(self, text: str) -> List[float]:
        """Generates embedding for query text using OpenAI text-embedding-3-small."""
        clean_text = (text or "").replace("\n", " ").strip()
        if not clean_text:
            clean_text = "lecture content"
        response = self.client.embeddings.create(
            model=self.embedding_model,
            input=clean_text
        )
        return response.data[0].embedding

    def embed_documents(self, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """Batch generates embeddings for list of texts."""
        embeddings: List[List[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = [t.replace("\n", " ").strip() or "empty" for t in texts[i:i + batch_size]]
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=cast(Any, batch)
            )
            embeddings.extend([item.embedding for item in response.data])
        return embeddings

    def ingest_pdf(
        self,
        file_input: Union[str, bytes, BinaryIO],
        pdf_name: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parses PDF, extracts text per page, chunks with RecursiveCharacterTextSplitter,
        computes OpenAI embeddings, and stores them in Firestore collection 'pdf_embeddings'.
        """
        pages: List[Dict[str, Any]] = []
        if pdf_name.lower().endswith(".pptx"):
            import zipfile
            import re
            if isinstance(file_input, (bytes, bytearray)):
                stream = io.BytesIO(file_input)
            elif isinstance(file_input, str):
                stream = open(file_input, "rb")
            else:
                stream = file_input

            with zipfile.ZipFile(stream) as z:
                slide_files = [n for n in z.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml")]
                def _get_slide_number(filename: str) -> int:
                    match = re.search(r'\d+', filename)
                    return int(match.group()) if match is not None else 0

                slide_files.sort(key=_get_slide_number)
                for page_num, s_file in enumerate(slide_files, start=1):
                    xml_content = z.read(s_file).decode("utf-8", errors="ignore")
                    texts = re.findall(r'<[a-zA-Z0-9_-]+:t[^>]*>(.*?)</[a-zA-Z0-9_-]+:t>', xml_content)
                    slide_text = " ".join([t.strip() for t in texts if t.strip()])
                    pages.append({
                        "page": page_num,
                        "text": slide_text.strip()
                    })
        else:
            # Prepare reader for PDF
            if isinstance(file_input, (bytes, bytearray)):
                stream = io.BytesIO(file_input)
                reader = PdfReader(stream)
            elif isinstance(file_input, str):
                reader = PdfReader(file_input)
            else:
                reader = PdfReader(file_input)

            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                pages.append({
                    "page": page_num,
                    "text": text.strip()
                })

        print(f"[RAG] Extracted {len(pages)} slides/pages from '{pdf_name}'")

        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150
        )

        documents: List[Dict[str, Any]] = []
        for p in pages:
            if not p["text"]:
                continue
            chunks = text_splitter.split_text(p["text"])
            for chunk in chunks:
                if chunk.strip():
                    documents.append({
                        "text": chunk.strip(),
                        "page": p["page"],
                        "pdf_name": pdf_name
                    })

        if not documents:
            # Fallback if text extraction was empty (scanned or image-only PDF)
            for p in pages:
                documents.append({
                    "text": f"Lecture slide {p['page']} from {pdf_name}",
                    "page": p["page"],
                    "pdf_name": pdf_name
                })

        print(f"[RAG] Created {len(documents)} chunks for '{pdf_name}'")

        # Generate embeddings
        chunk_texts = [d["text"] for d in documents]
        vectors = self.embed_documents(chunk_texts)

        # Store into Firestore
        saved_count = 0
        now_str = datetime.now(timezone.utc).isoformat()

        for i, (doc, vector) in enumerate(zip(documents, vectors)):
            doc_data = {
                "text": doc["text"],
                "embedding": Vector(vector) if (HAS_FIRESTORE and Vector) else vector,
                "chunk_id": i,
                "page": doc["page"],
                "pdf_name": pdf_name,
                "session_id": session_id or "default",
                "created_at": now_str
            }

            # If Firestore is active, save to collection
            if self.collection_ref is not None:
                try:
                    self.collection_ref.add(doc_data)
                    saved_count += 1
                except Exception as err:
                    print(f"[RAG] Error writing chunk {i} to Firestore: {err}")

            # Keep in memory for instant local fallback
            self._memory_chunks.append({
                "text": doc["text"],
                "embedding": vector,
                "chunk_id": i,
                "page": doc["page"],
                "pdf_name": pdf_name
            })

        print(f"[RAG] Saved {saved_count} chunks to Firestore 'pdf_embeddings' (Total in memory: {len(self._memory_chunks)})")

        return {
            "status": "success",
            "pdf_name": pdf_name,
            "page_count": len(pages),
            "chunk_count": len(documents),
            "firestore_saved": saved_count,
            "firestore_connected": self.collection_ref is not None,
            "pages": pages
        }

    def retrieve_context(
        self,
        query: str,
        k: int = 5,
        pdf_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k relevant lecture chunks using Firestore Vector Search (Cosine distance).
        Falls back to in-memory cosine similarity if Firestore vector search is unavailable.
        """
        if not query or not query.strip():
            return []

        query_vector = self.embed_query(query)
        retrieved_chunks: List[Dict[str, Any]] = []

        # 1. Try Firestore Vector Search
        if self.collection_ref is not None and HAS_FIRESTORE and Vector and DistanceMeasure:
            try:
                base_query = self.collection_ref
                if pdf_name:
                    base_query = base_query.where("pdf_name", "==", pdf_name)

                results = base_query.find_nearest(
                    vector_field="embedding",
                    query_vector=Vector(query_vector),
                    distance_measure=DistanceMeasure.COSINE,
                    limit=k
                ).get()

                for result in results:
                    data = result.to_dict() or {}
                    retrieved_chunks.append({
                        "text": data.get("text", ""),
                        "page": data.get("page", 1),
                        "pdf_name": data.get("pdf_name", ""),
                        "chunk_id": data.get("chunk_id", 0)
                    })

                if retrieved_chunks:
                    return retrieved_chunks
            except Exception as e:
                print(f"[RAG] Firestore vector search notice: {e}. Falling back to in-memory similarity.")

        # 2. In-Memory Vector Cosine Similarity Fallback
        if self._memory_chunks:
            candidates = self._memory_chunks
            if pdf_name:
                candidates = [c for c in candidates if c.get("pdf_name") == pdf_name]

            def cosine_similarity(v1: List[float], v2: List[float]) -> float:
                dot = sum(a * b for a, b in zip(v1, v2))
                norm1 = math.sqrt(sum(a * a for a in v1))
                norm2 = math.sqrt(sum(b * b for b in v2))
                return dot / (norm1 * norm2) if (norm1 and norm2) else 0.0

            scored = []
            for c in candidates:
                sim = cosine_similarity(query_vector, c["embedding"])
                scored.append((sim, c))

            scored.sort(key=lambda x: x[0], reverse=True)
            for sim, c in scored[:k]:
                retrieved_chunks.append({
                    "text": c["text"],
                    "page": c.get("page", 1),
                    "pdf_name": c.get("pdf_name", ""),
                    "chunk_id": c.get("chunk_id", 0),
                    "similarity": round(sim, 4)
                })

        return retrieved_chunks

    def format_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Formats a list of retrieved chunks into an LLM-ready prompt string."""
        if not chunks:
            return ""
        return "\n\n".join(
            f"[Lecture Page {c.get('page', '?')}]:\n{c.get('text', '')}"
            for c in chunks
        )

    def get_status(self) -> Dict[str, Any]:
        """Returns status of RAG service, Firestore connection, and stored chunks."""
        return {
            "firestore_connected": self.collection_ref is not None,
            "collection_name": self.collection_name,
            "embedding_model": self.embedding_model,
            "memory_chunks_count": len(self._memory_chunks),
            "credentials_configured": bool(self.firebase_credentials_path or self._find_service_account_file())
        }
