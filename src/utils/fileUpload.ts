import { Lecture, Slide } from '../types';

export async function parseUploadedFile(file: File, onProgress?: (pct: number) => void): Promise<Lecture> {
  const fileName = file.name;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  if (fileExt === 'pdf') {
    return parsePdfFile(file, title, onProgress);
  } else {
    return parseTextOrPptxFile(file, title);
  }
}

async function parsePdfFile(file: File, title: string, onProgress?: (pct: number) => void): Promise<Lecture> {
  try {
    // Attempt to load pdfjs-dist dynamically
    const pdfjsLib = await import('pdfjs-dist');
    // Set worker source to local same-origin file to avoid browser CORS/cross-origin worker blocking
    try {
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
    } catch {
      // ignore
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + (pdfjsLib.version || '6.3.289') + '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + (pdfjsLib.version || '6.3.289') + '/standard_fonts/',
    });
    const pdf = await loadingTask.promise;
    // Support all pages (e.g. 41+ pages) up to 120
    const numPages = Math.min(pdf.numPages, 120);
    const slides: Slide[] = [];

    for (let i = 1; i <= numPages; i++) {
      if (onProgress) {
        onProgress(Math.round((i / numPages) * 100));
      }
      const page = await pdf.getPage(i);
      
      // 1. Render actual PDF page to ultra-crisp high-res image data URL
      let pageImageUrl: string | undefined = undefined;
      try {
        // High DPI rendering (scale 2.0) ensures text, equations, and diagrams remain razor sharp
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill white background first (vital for transparent PDFs so they don't turn black in JPEG)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          const renderTask = (page.render as any)({
            canvasContext: ctx,
            viewport: viewport
          });
          await renderTask.promise;
          pageImageUrl = canvas.toDataURL('image/jpeg', 0.90);
        }
      } catch (renderErr) {
        console.warn(`[PDF] Canvas rendering for page ${i} skipped:`, renderErr);
      }

      // 2. Extract text for AI Coach analysis
      let rawText = '';
      try {
        const textContent = await page.getTextContent();
        rawText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch (textErr) {
        console.warn(`[PDF] Text extraction on page ${i}:`, textErr);
      }

      const lines = rawText
        .split(/\s{2,}|\.\s+|\n+/)
        .map(l => l.trim())
        .filter(l => l.length > 3);

      const pageTitle = lines[0] ? lines[0].slice(0, 75) : `Slide ${i}`;
      const subtitle = lines[1] && lines[1].length < 90 && lines[1] !== pageTitle ? lines[1] : undefined;
      const content = lines.slice(subtitle ? 2 : 1, 8);
      const keyPoints = content.slice(0, 3);

      slides.push({
        id: `pdf-page-${i}`,
        pageNumber: i,
        title: pageTitle || `Slide ${i}`,
        subtitle,
        content: content.length > 0 ? content : (rawText ? [rawText.slice(0, 300)] : []),
        keyPoints: keyPoints.length > 0 ? keyPoints : (content.length > 0 ? content.slice(0, 3) : (pageTitle ? [pageTitle] : [])),
        topic: pageTitle || `Slide ${i}`,
        densityScore: Math.min(5, Math.max(2, Math.round(lines.length / 3))),
        pageImageUrl
      });
    }

    if (slides.length === 0) {
      throw new Error('Could not parse any pages from PDF');
    }

    return {
      id: `lecture-${Date.now()}`,
      title,
      subject: 'Uploaded Document',
      authorOrCourse: 'Imported File',
      totalPages: slides.length,
      slides,
      createdAt: new Date().toISOString().split('T')[0],
      lastStudiedAt: new Date().toISOString().split('T')[0],
      baselineSecsPerPage: 90,
      currentPage: 1,
      totalStudySeconds: 0,
      focusPoints: 20
    };
  } catch (err) {
    console.warn('PDF parsing fallback to text reader:', err);
    return createFallbackLectureFromFile(file, title);
  }
}

async function parseTextOrPptxFile(file: File, title: string): Promise<Lecture> {
  try {
    const text = await file.text();
    // Split by common slide delimiters or markdown headers
    const chunks = text.split(/(?:---|\n## |\n# |Slide \d+:)/i).filter(c => c.trim().length > 20);
    
    const slides: Slide[] = (chunks.length > 0 ? chunks : [text]).slice(0, 25).map((chunk, idx) => {
      const rawLines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      const lines: string[] = [];
      for (const line of rawLines) {
        const parts = line.split(/[●•·]/).map((p: string) => p.trim()).filter((p: string) => p.length > 5);
        if (parts.length > 1) {
          lines.push(...parts);
        } else {
          lines.push(line.replace(/^[●•·\-\*]\s*/, '').trim());
        }
      }

      const pageTitle = lines[0]?.replace(/^[#\-\s]+/, '').slice(0, 60) || `Slide ${idx + 1}`;
      const content = lines.slice(1, 8);
      const keyPoints = content.slice(0, 3).map(k => k.replace(/^[0-9]+[\.\-\)]\s*/, '').trim());
      return {
        id: `slide-${idx + 1}`,
        pageNumber: idx + 1,
        title: pageTitle,
        content: content.length > 0 ? content : ['Section notes and key lecture points.'],
        keyPoints: keyPoints.length > 0 ? keyPoints : ['Core concept review and application'],
        topic: pageTitle,
        densityScore: 3
      };
    });

    return {
      id: `lecture-${Date.now()}`,
      title,
      subject: 'Uploaded Slides',
      authorOrCourse: 'Imported Presentation',
      totalPages: slides.length,
      slides,
      createdAt: new Date().toISOString().split('T')[0],
      lastStudiedAt: new Date().toISOString().split('T')[0],
      baselineSecsPerPage: 80,
      currentPage: 1,
      totalStudySeconds: 0,
      focusPoints: 20
    };
  } catch {
    return createFallbackLectureFromFile(file, title);
  }
}

function createFallbackLectureFromFile(file: File, title: string): Lecture {
  const defaultSlides: Slide[] = [
    {
      id: 'slide-1',
      pageNumber: 1,
      title: `${title} - Introduction`,
      subtitle: 'Key Foundations & Concepts',
      topic: 'Core Fundamentals',
      densityScore: 3,
      content: [
        `Studying uploaded lecture material from "${file.name}".`,
        'Focus on core terminology, operational mechanisms, and foundational theorems.',
        'Use the pen and highlighter in the top bar to mark important arguments.'
      ],
      keyPoints: [
        'Understand definitions before proceeding to mechanics.',
        'Annotate confusing sections for follow-up questions.'
      ]
    },
    {
      id: 'slide-2',
      pageNumber: 2,
      title: 'Detailed Analytical Breakdown',
      subtitle: 'System Components & Interactions',
      topic: 'Mechanisms & Processes',
      densityScore: 4,
      content: [
        'Detailed steps of the central process under investigation.',
        'Interaction between constraints, input parameters, and output results.',
        'Edge cases and stability under perturbations.'
      ],
      keyPoints: [
        'Trace step-by-step causality across the system.',
        'Identify dependencies between stages.'
      ]
    },
    {
      id: 'slide-3',
      pageNumber: 3,
      title: 'Synthesis & Exam Applications',
      subtitle: 'Practical Problem Solving & Evaluation',
      topic: 'Critical Review',
      densityScore: 3,
      content: [
        'Synthesizing the theoretical principles with practical applications.',
        'Typical exam scenarios and common pitfalls to avoid.',
        'Preparing for the wrap-up comprehension check.'
      ],
      keyPoints: [
        'Test your mental model against edge cases.',
        'Be ready to explain the concepts in your own words.'
      ]
    }
  ];

  return {
    id: `lecture-${Date.now()}`,
    title,
    subject: 'Study Material',
    authorOrCourse: file.name,
    totalPages: defaultSlides.length,
    slides: defaultSlides,
    createdAt: new Date().toISOString().split('T')[0],
    lastStudiedAt: new Date().toISOString().split('T')[0],
    baselineSecsPerPage: 90,
    currentPage: 1,
    totalStudySeconds: 0,
    focusPoints: 20
  };
}

export function createLectureFromText(title: string, rawText: string, subject = 'Lecture Notes'): Lecture {
  const chunks = rawText.split(/(?:---|\n## |\n# |Slide \d+:)/i).filter(c => c.trim().length > 10);
  const slides: Slide[] = (chunks.length > 0 ? chunks : [rawText]).slice(0, 25).map((chunk, idx) => {
    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
    const pageTitle = lines[0]?.replace(/^[#\-\s]+/, '').slice(0, 60) || `Section ${idx + 1}`;
    const content = lines.slice(1, 7);
    return {
      id: `custom-slide-${idx + 1}`,
      pageNumber: idx + 1,
      title: pageTitle,
      content: content.length > 0 ? content : [chunk.slice(0, 300)],
      keyPoints: content.slice(0, 3).length > 0 ? content.slice(0, 3) : [`Core ideas from section ${idx + 1}`],
      topic: pageTitle,
      densityScore: 3
    };
  });

  return {
    id: `lecture-custom-${Date.now()}`,
    title: title.trim() || 'Custom Lecture Notes',
    subject,
    authorOrCourse: 'Student Notes',
    totalPages: slides.length,
    slides,
    createdAt: new Date().toISOString().split('T')[0],
    lastStudiedAt: new Date().toISOString().split('T')[0],
    baselineSecsPerPage: 85,
    currentPage: 1,
    totalStudySeconds: 0,
    focusPoints: 20
  };
}

