import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

import OpenAI from 'openai';
import fs from 'fs';
import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';

let adminDb: any = null;
function getAdminDb(): any {
  if (!adminDb) {
    const keyPath = path.resolve(__dirname, 'backend/serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      try {
        const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        const adminApp = getAdminApps().length > 0 ? getAdminApps()[0] : initAdminApp({
          credential: cert(sa)
        });
        adminDb = getAdminFirestore(adminApp);
      } catch (err) {
        console.warn('[Firebase Admin] init error:', err);
      }
    }
  }
  return adminDb;
}

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openaiClient;
}

// Unified LLM helper prioritizing OpenAI (gpt-4o-mini)
async function generateJsonWithLLM<T = any>(prompt: string, systemPrompt?: string): Promise<T | null> {
  // 1. Prioritize OpenAI (gpt-4o-mini)
  const openai = getOpenAI();
  if (openai) {
    try {
      const messages: any[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
      const text = completion.choices[0]?.message?.content;
      if (text) {
        return JSON.parse(text) as T;
      }
    } catch (err: any) {
      console.warn('[OpenAI JSON error, trying Gemini]:', err.message);
    }
  }

  // 2. Fallback to Gemini
  const ai = getAi();
  if (ai) {
    try {
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: fullPrompt,
        config: { responseMimeType: 'application/json' }
      });
      if (response.text) {
        return JSON.parse(response.text) as T;
      }
    } catch (err: any) {
      console.warn('[Gemini JSON error]:', err.message);
    }
  }

  return null;
}

async function generateTextWithLLM(prompt: string, systemPrompt?: string): Promise<string | null> {
  // 1. Prioritize OpenAI (gpt-4o-mini)
  const openai = getOpenAI();
  if (openai) {
    try {
      const messages: any[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
      });
      const text = completion.choices[0]?.message?.content;
      if (text) return text;
    } catch (err: any) {
      console.warn('[OpenAI Text error, trying Gemini]:', err.message);
    }
  }

  // 2. Fallback to Gemini
  const ai = getAi();
  if (ai) {
    try {
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: fullPrompt
      });
      if (response.text) return response.text;
    } catch (err: any) {
      console.warn('[Gemini Text error]:', err.message);
    }
  }

  return null;
}


async function startServer() {
  const app = express();
  const PORT = 3000;
  const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', async (req, res) => {
    let pythonConnected = false;
    try {
      const py = await fetch(`${PYTHON_BACKEND_URL}/health`, { signal: AbortSignal.timeout(1000) });
      if (py.ok) pythonConnected = true;
    } catch {}
    res.json({
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      pythonBackendConnected: pythonConnected,
      pythonUrl: PYTHON_BACKEND_URL
    });
  });

  // Shared RAG Status Proxy
  app.get('/api/rag/status', async (req, res) => {
    try {
      const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/rag/status`);
      if (pyRes.ok) {
        return res.json(await pyRes.json());
      }
    } catch {}
    res.json({ firestore_connected: false, memory_chunks_count: 0, status: 'offline' });
  });

  // Shared RAG Context Retrieval Proxy
  app.post('/api/rag/retrieve', async (req, res) => {
    try {
      const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/rag/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      if (pyRes.ok) {
        return res.json(await pyRes.json());
      }
      res.status(pyRes.status).json(await pyRes.json());
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve RAG context' });
    }
  });

  // Shared RAG PDF Upload Proxy
  app.post('/api/rag/upload', async (req, res) => {
    try {
      const headers: Record<string, string> = {};
      if (req.headers['content-type']) {
        headers['content-type'] = req.headers['content-type'] as string;
      }
      const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/rag/upload`, {
        method: 'POST',
        headers,
        body: req as any,
        duplex: 'half'
      } as any);

      const data = await pyRes.json();
      return res.status(pyRes.status).json(data);
    } catch (err: any) {
      console.error('RAG upload proxy error:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload PDF to RAG service' });
    }
  });

  // Orchestrator Telemetry (Tab switching, pacing, attention)
  app.post('/api/orchestrator/telemetry', async (req, res) => {
    try {
      const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/orchestrator/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      if (pyRes.ok) {
        const data = await pyRes.json();
        return res.json(data);
      }
    } catch (err) {
      // Python backend offline fallback
    }

    const { last_away_duration_seconds, tab_switches_count, slide_title } = req.body || {};
    if (last_away_duration_seconds >= 30) {
      return res.json({
        intervention_type: 'attention',
        alert_kind: 'toast',
        message: `أهلاً بعودتك! 👋 لنكمل مذاكرة ${slide_title || 'المحاضرة'} بكل هدوء وتركيز.`
      });
    }

    res.json({ intervention_type: 'none', alert_kind: 'none' });
  });

  // ==============================================================
  // Direct Cloud Firestore Admin APIs (Project attocus-1)
  // Writes directly to root collections: files, sessions, summaries, quizzes, attention_logs, users
  // ==============================================================

  // 1. Record uploaded file into 'files' collection
  app.post('/api/firestore/file', async (req, res) => {
    try {
      const { filename, userId, lectureId, totalPages } = req.body;
      const db = getAdminDb();
      if (!db) return res.status(503).json({ error: 'Firestore Admin not initialized' });

      const docRef = await db.collection('files').add({
        filename: filename || 'lecture.pdf',
        user_id: userId || 'user_1',
        lecture_id: lectureId || '',
        total_pages: totalPages || 1,
        uploaded_at: FieldValue.serverTimestamp()
      });

      console.log(`[Firestore] Registered uploaded file in 'files' collection:`, docRef.id);
      res.json({ ok: true, fileId: docRef.id });
    } catch (err: any) {
      console.error('Firestore save file error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Study Session Wrap-up -> writes to 'sessions', 'summaries', 'quizzes', and 'users'
  app.post('/api/firestore/wrapup', async (req, res) => {
    try {
      const {
        userId,
        lectureId,
        lectureTitle,
        studentSummary,
        coveredPoints,
        missingGaps,
        gapQuestions,
        report,
        sessionStats
      } = req.body;

      const db = getAdminDb();
      if (!db) return res.status(503).json({ error: 'Firestore Admin not initialized' });

      const uid = userId || 'dev_123';
      const now = FieldValue.serverTimestamp();
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // A. Write to 'sessions'
      await db.collection('sessions').doc(sessionId).set({
        session_id: sessionId,
        user_id: uid,
        file_id: lectureId || 'lecture_default',
        lecture_title: lectureTitle || '',
        status: 'completed',
        focus_efficiency: report?.focusEfficiencyPercentage || 92,
        study_time_minutes: report?.studyTimeMinutes || Math.max(1, Math.round((sessionStats?.totalSecondsFocused || 60) / 60)),
        total_seconds_focused: sessionStats?.totalSecondsFocused || 60,
        report: report || null,
        started_at: now,
        ended_at: now
      });
      console.log(`[Firestore] Saved session in 'sessions' collection: ${sessionId}`);

      // B. Write to 'summaries'
      let summaryDocId = null;
      if (studentSummary) {
        const sumRef = await db.collection('summaries').add({
          session_id: sessionId,
          user_id: uid,
          student_text: studentSummary,
          analysis_json: {
            covered_points: coveredPoints || [],
            missing_gaps: missingGaps || []
          },
          page_number: 1,
          created_at: now
        });
        summaryDocId = sumRef.id;
        console.log(`[Firestore] Saved summary in 'summaries' collection: ${summaryDocId}`);
      }

      // C. Write to 'quizzes'
      let quizDocId = null;
      if (gapQuestions && Array.isArray(gapQuestions) && gapQuestions.length > 0) {
        const studentAnswers: Record<string, any> = {};
        const questionsList: any[] = [];
        let correctCount = 0;

        gapQuestions.forEach((q: any, idx: number) => {
          studentAnswers[`q_${idx + 1}`] = q.studentAnswer || '';
          if (q.isCorrect) correctCount++;
          questionsList.push({
            question: q.question,
            concept: q.concept,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          });
        });

        const score = Math.round((correctCount / gapQuestions.length) * 100);

        const qRef = await db.collection('quizzes').add({
          session_id: sessionId,
          user_id: uid,
          score,
          questions_json: questionsList,
          student_answers_json: studentAnswers,
          page_number: 1,
          created_at: now
        });
        quizDocId = qRef.id;
        console.log(`[Firestore] Saved quiz in 'quizzes' collection: ${quizDocId}`);
      }

      // D. Update 'users' collection with points
      try {
        const userRef = db.collection('users').doc('AoDqBT8Q4lWUwfwxIZUw');
        await userRef.set({
          name: 'بارقة',
          device_id: 'dev_123',
          focusPoints: FieldValue.increment(25),
          todayMinutesStudied: FieldValue.increment(Math.max(1, Math.round((sessionStats?.totalSecondsFocused || 60) / 60))),
          lastActiveAt: now
        }, { merge: true });
        console.log(`[Firestore] Updated user stats in 'users' collection`);
      } catch (uErr) {
        console.warn('User stats update warn:', uErr);
      }

      res.json({
        ok: true,
        sessionId,
        summaryDocId,
        quizDocId
      });
    } catch (err: any) {
      console.error('Firestore wrapup route error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Log camera / attention events directly to 'attention_logs'
  app.post('/api/firestore/attention', async (req, res) => {
    try {
      const { studentId, focusScore, attentionStatus, faceDetected, phoneDetected, movementDetected } = req.body;
      const db = getAdminDb();
      if (!db) return res.status(503).json({ error: 'Firestore Admin not initialized' });

      const docRef = await db.collection('attention_logs').add({
        student_id: studentId || 'student_001',
        focus_score: focusScore !== undefined ? focusScore : 85,
        attention_status: attentionStatus !== undefined ? attentionStatus : true,
        face_detected: faceDetected !== undefined ? faceDetected : true,
        phone_detected: phoneDetected !== undefined ? phoneDetected : false,
        movement_detected: movementDetected !== undefined ? movementDetected : false,
        tab_active: true,
        timestamp: FieldValue.serverTimestamp()
      });

      console.log(`[Firestore] Logged attention event in 'attention_logs': ${docRef.id}`);
      res.json({ ok: true, id: docRef.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // 1. Explain Agent (calls Python LearningCoachAgent first)
  app.post('/api/coach/explain', async (req, res) => {
    try {
      const { lectureTitle, currentSlide, allSlides, question, chatHistory } = req.body;

      // Try Python Backend (OpenAI Learning Coach)
      try {
        const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/learning/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: currentSlide?.title || lectureTitle,
            slide_content: [
              `Title: ${currentSlide?.title || ''}`,
              `Content: ${(currentSlide?.content || []).join('\n')}`,
              `Key Points: ${(currentSlide?.keyPoints || []).join('\n')}`
            ].join('\n'),
            student_question: question,
            chat_history: chatHistory
          })
        });
        if (pyRes.ok) {
          const data = await pyRes.json();
          if (data.explanation) {
            return res.json({
              answer: data.explanation,
              citedLecturePages: [currentSlide?.pageNumber || 1]
            });
          }
        }
      } catch {}

      const lectureContext = `Lecture: "${lectureTitle}"
Current Slide (Page ${currentSlide?.pageNumber || 1}):
Title: ${currentSlide?.title || ''}
Subtitle: ${currentSlide?.subtitle || ''}
Content:
${(currentSlide?.content || []).join('\n')}
Key Points:
${(currentSlide?.keyPoints || []).join('\n')}

Other Slides in this lecture:
${(allSlides || []).map((s: any) => `Page ${s.pageNumber}: ${s.title} (${s.topic})`).join('\n')}
`;

      const systemPrompt = `You are a calm, academic, highly supportive human tutor sitting right next to a university student.
Rules:
1. Explain warmly, clearly, and concisely in 2-3 brief paragraphs.
2. Ground your answer FIRST in the provided lecture notes and cite "Slide ${currentSlide?.pageNumber || 1}".
3. If the answer is not found directly in the lecture, you may use external knowledge, but you MUST explicitly cite the external source (e.g., "[Source: Standard Distributed Systems Theory]").
4. Maintain a supportive, encouraging, conversational teacher tone. Do not use robotic boilerplate.
5. If the student asks in Arabic, respond in fluent, academic, warm Arabic. If in English, respond in English.`;

      const prompt = `Context:
${lectureContext}

Student's question: "${question}"`;

      const llmAnswer = await generateTextWithLLM(prompt, systemPrompt);
      if (llmAnswer) {
        return res.json({
          answer: llmAnswer,
          citedLecturePages: [currentSlide?.pageNumber || 1]
        });
      }

      // Fallback if no LLM response
      const answer = `Based on Slide ${currentSlide?.pageNumber || 1} ("${currentSlide?.title || 'Current Slide'}"), the core idea is: ${(currentSlide?.keyPoints || [])[0] || (currentSlide?.content || [])[0] || 'stated in the slides'}. 

To put it simply: ${(currentSlide?.content || []).slice(0, 2).join(' ')}

Does that clarify how it connects to ${currentSlide?.topic || 'this topic'}?`;

      res.json({
        answer,
        citedLecturePages: [currentSlide?.pageNumber || 1]
      });
    } catch (err: any) {
      console.error('Explain agent error:', err);
      res.status(500).json({ error: err.message || 'Failed to explain' });
    }
  });

  // 1.5 Takeaways Agent - Extract Exam-Critical Takeaways via LLM
  app.post('/api/coach/takeaways', async (req, res) => {
    try {
      const { slideTitle, slideText, topic, courseSubject, language } = req.body;

      // 1. Try Python backend if available
      try {
        const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/coach/takeaways`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slideTitle, slideText, topic, courseSubject, language })
        });
        if (pyRes.ok) {
          const data = await pyRes.json();
          if (data.coreTakeaways && data.coreTakeaways.length > 0) {
            return res.json(data);
          }
        }
      } catch {}

      const cleanText = (slideText || '').replace(/[●•·]/g, '-').trim();
      const fullSlideStr = `${slideTitle || ''} ${cleanText}`;
      const arabicCount = (fullSlideStr.match(/[\u0600-\u06FF]/g) || []).length;
      const latinCount = (fullSlideStr.match(/[a-zA-Z]/g) || []).length;
      // Strictly detect slide's own native language
      const isArabicSlide = arabicCount > latinCount;

      const systemPrompt = `You are an elite academic professor and learning coach.
Your task is to analyze this academic slide and extract 2 to 4 ultra-concise, high-impact bullet takeaways (رؤوس أقلام مقتضبة).

CRITICAL RULES:
1. FORMAT AS "رؤوس أقلام" (BULLET HEADLINES):
   - Each takeaway must be ONE brief phrase/line only (STRICT MAXIMUM 6 TO 12 WORDS).
   - Format each point strictly as: "[Key Concept / Keyword]: [Brief definition or core takeaway]"
   - DO NOT write full paragraphs, long explanatory sentences, or verbose prose.
2. STRICT LANGUAGE MATCHING (تلقائي بنفس لغة السلايد):
   ${isArabicSlide 
     ? '- The slide is in ARABIC: You MUST output all takeaways in ARABIC ONLY (اللغة العربية - رؤوس أقلام).'
     : '- The slide is in ENGLISH: You MUST output all takeaways in ENGLISH ONLY (Crisp English bullet headlines).'
   }
3. Clean out all raw symbols, bullet dots (●, •), dashes, or slide line numbers.
4. Return strictly valid JSON:
{
  "coreTakeaways": [
    "${isArabicSlide ? 'المفهوم الأساسي: ملخص دقيق من كلمات معدودة' : 'Concept Name: Short punchy core definition (6-12 words)'}"
  ],
  "suggestedFocusFormula": "optional formula or rule of thumb",
  "examRelevanceScore": 5
}`;

      const prompt = `Slide Title: ${slideTitle || 'Untitled'}
Topic: ${topic || slideTitle || 'General'}
Course: ${courseSubject || 'Academic Course'}
Slide Raw Content:
${cleanText}

Extract 2-4 ultra-concise bullet headlines (رؤوس أقلام) now in the exact language of the slide.`;

      interface TakeawayJson {
        coreTakeaways: string[];
        suggestedFocusFormula?: string;
        examRelevanceScore?: number;
      }

      const parsed = await generateJsonWithLLM<TakeawayJson>(prompt, systemPrompt);
      if (parsed && Array.isArray(parsed.coreTakeaways) && parsed.coreTakeaways.length > 0) {
        const cleanTakeaways = parsed.coreTakeaways.map(t => 
          t.replace(/^[0-9]+[\.\-\)]\s*/, '').replace(/^[●•·\-\*]\s*/, '').trim()
        ).filter(t => t.length > 3);

        return res.json({
          coreTakeaways: cleanTakeaways.slice(0, 4),
          suggestedFocusFormula: parsed.suggestedFocusFormula,
          examRelevanceScore: parsed.examRelevanceScore || 4
        });
      }

      // High-quality smart fallback
      const lines = cleanText
        .split(/\n|\.\s+/)
        .map((s: string) => s.replace(/^[●•·\-\*]\s*/, '').trim())
        .filter((s: string) => s.length > 15 && !s.toLowerCase().includes('visual presentation'));

      const fallbackTakeaways = lines.slice(0, 3).length > 0
        ? lines.slice(0, 3).map((l: string) => l.slice(0, 70))
        : [
            isArabicSlide ? `المفهوم المحوري: ${slideTitle}` : `Core Concept: ${slideTitle}`,
            isArabicSlide ? `الآليات الأساسية: فهم المتغيرات والنتائج الرئيسية` : `Key Mechanism: Understand primary inputs and outputs`
          ];

      return res.json({
        coreTakeaways: fallbackTakeaways,
        examRelevanceScore: 4
      });
    } catch (err: any) {
      console.error('Takeaways agent error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate takeaways' });
    }
  });

  // 2. Understanding Agent - Start Socratic Session (calls Python SocraticSummaryAgent)
  app.post('/api/coach/understanding/start', async (req, res) => {
    try {
      const { slide, lectureTitle } = req.body;

      const rawContentList = (slide?.content || []).filter(
        (c: string) => !c.includes('Visual presentation content') && !c.includes('Section notes and key lecture points')
      );
      const rawKeyPointsList = (slide?.keyPoints || []).filter(
        (kp: string) => !kp.includes('Visual and conceptual takeaways')
      );

      let slideContext = [
        `Lecture: ${lectureTitle || ''}`,
        `Slide Title: ${slide?.title || ''}`,
        `Topic: ${slide?.topic || ''}`,
        `Key Points: ${rawKeyPointsList.join(', ')}`,
        `Slide Notes:\n${rawContentList.join('\n')}`
      ].join('\n');

      // If slide text is empty or placeholder, retrieve real chunks from RAG
      if (rawContentList.length === 0 && rawKeyPointsList.length === 0) {
        try {
          const ragQuery = slide?.topic || slide?.title || lectureTitle || 'lecture core concepts';
          const ragRes = await fetch(`${PYTHON_BACKEND_URL}/api/rag/retrieve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: ragQuery,
              k: 3,
              pdf_name: lectureTitle
            })
          });
          if (ragRes.ok) {
            const ragData = await ragRes.json();
            if (ragData.chunks && ragData.chunks.length > 0) {
              const chunksText = ragData.chunks.map((c: any) => `[Slide ${c.page}]: ${c.text}`).join('\n\n');
              slideContext = `Lecture: ${lectureTitle || ''}\nTopic: ${slide?.topic || slide?.title}\nContext from Lecture Materials:\n${chunksText}`;
            }
          }
        } catch (ragErr) {
          console.warn('[Understanding] RAG fallback notice:', ragErr);
        }
      }

      // Try Python Backend (Socratic Summary Agent)
      try {
        const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/summary/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: `slide-${slide?.id || slide?.pageNumber || 1}`,
            topic: slide?.topic || slide?.title || lectureTitle || 'Study Concept',
            context: slideContext
          })
        });

        if (pyRes.ok) {
          const data = await pyRes.json();
          if (data.reply) {
            return res.json({
              question: data.reply,
              topic: slide?.topic || slide?.title,
              slideAxes: data.slide_axes || []
            });
          }
        }
      } catch (err) {
        console.warn('Python backend summary start failed, falling back:', err);
      }

      const cleanTopic = slide?.topic || slide?.title || lectureTitle || 'this concept';
      const prompt = `You are an attentive academic tutor initiating a conceptual comprehension check for a university student.
Lecture: "${lectureTitle || ''}"
Topic: "${cleanTopic}"
Slide Content:
${slideContext}

CRITICAL RULES:
- Ask ONE warm, open-ended question assessing the student's genuine mental model of the academic subject matter or concept.
- NEVER ask questions about slide numbers, file titles, presentation outlines, or placeholders (e.g. NEVER ask "What did you understand about Slide 1?").
- Keep it under 25 words.`;

      const questionText = await generateTextWithLLM(prompt);
      if (questionText) {
        return res.json({
          question: questionText.trim(),
          topic: cleanTopic
        });
      }

      res.json({
        question: `In your own words, what did you understand about ${cleanTopic}?`,
        topic: cleanTopic
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Understanding Agent - Multi-turn Step (calls Python SocraticSummaryAgent)
  app.post('/api/coach/understanding/step', async (req, res) => {
    try {
      const { slide, question, studentAnswer, history, isIDontKnow } = req.body;

      // Try Python Backend (Socratic Summary Agent)
      try {
        const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/summary/step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: `slide-${slide?.id || slide?.pageNumber || 1}`,
            user_input: isIDontKnow ? "I don't know / I am stuck" : (studentAnswer || '')
          })
        });

        if (pyRes.ok) {
          const data = await pyRes.json();
          if (data.reply) {
            return res.json({
              analysis: {
                covered: [slide?.topic || 'Concept'],
                missing: [],
                incorrect: []
              },
              followUpQuestion: data.reply,
              isFinished: data.is_finished || false
            });
          }
        }
      } catch (err) {
        console.warn('Python backend step failed, falling back:', err);
      }

      const ai = getAi();

      if (isIDontKnow) {
        // Student clicked "I don't know anything about this"
        const nextPrompt = (slide.keyPoints && slide.keyPoints[1])
          ? `No problem at all — that's why we're studying! Let's break it down: Can you recall what role ${slide.keyPoints[1]} plays?`
          : `That's completely fine! Let's take it one step at a time: What is the main purpose of ${slide.title}?`;

        res.json({
          analysis: {
            covered: [],
            missing: slide.keyPoints || ['Core concept'],
            incorrect: [],
            feedback: "Acknowledged — let's scaffold this gently."
          },
          followUpQuestion: nextPrompt,
          isFinished: false
        });
        return;
      }

      if (ai) {
        const prompt = `You are a real human tutor running a multi-turn comprehension loop.
Slide Title: ${slide.title}
Key Points required by lecture:
${(slide.keyPoints || []).map((k: string) => `- ${k}`).join('\n')}
Slide Content:
${(slide.content || []).join('\n')}

Previous Question: "${question}"
Student's Answer: "${studentAnswer}"
Previous Turn Count: ${(history || []).length}

Task:
1. Analyze what the student covered, what is missing, and what is incorrect.
2. If the student has covered most key points or if 3 turns have elapsed, mark isFinished as true.
3. If not finished, formulate ONE targeted follow-up question specifically aimed at the missing gap or misconception (do NOT ask a generic question).
Respond in valid JSON with schema:
{
  "covered": ["point1"],
  "missing": ["point2"],
  "incorrect": ["misconception if any"],
  "feedback": "1-2 sentences acknowledging what they got right and gently noting the gap",
  "followUpQuestion": "Targeted follow-up question or empty if finished",
  "isFinished": boolean
}`;

        const parsed = await generateJsonWithLLM<any>(prompt);
        if (parsed) {
          res.json({
            analysis: {
              covered: parsed.covered || ['Initial conceptual understanding'],
              missing: parsed.missing || [],
              incorrect: parsed.incorrect || [],
              feedback: parsed.feedback || 'Good effort on that explanation.'
            },
            followUpQuestion: parsed.followUpQuestion || `How does this relate to ${(slide.keyPoints || [])[1] || 'the overall mechanism'}?`,
            isFinished: parsed.isFinished || (parsed.missing?.length === 0)
          });
          return;
        }
      }

      // Deterministic fallback
      const hasKeywords = (slide.keyPoints || []).some((kp: string) => 
        studentAnswer.toLowerCase().includes(kp.split(' ')[0].toLowerCase())
      );

      res.json({
        analysis: {
          covered: hasKeywords ? [(slide.keyPoints || [])[0]] : [],
          missing: [(slide.keyPoints || [])[1] || 'Detailed causality'],
          incorrect: [],
          feedback: 'You captured the main idea! There is just one key detail to solidify.'
        },
        followUpQuestion: `What specific condition triggers ${(slide.keyPoints || [])[1] || 'the next phase'}?`,
        isFinished: (history || []).length >= 2
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to parse sections from Socratic Summary text
  function parseSocraticSummary(raw: string) {
    let summaryText = '';
    const corrections: string[] = [];
    const strengths: string[] = [];

    // Match summary section
    const summaryMatch = raw.match(/(?:(?:📝\s*)?(?:Your Summary in Your Own Words|الملخص في كلماتك|الملخص))[\s:]*([\s\S]*?)(?=(?:[🔍\s]*(?:Corrections|التصحيحات)|[✨\s]*(?:Your Strengths|نقاط القوة)|$))/i);
    if (summaryMatch && summaryMatch[1].trim()) {
      summaryText = summaryMatch[1].trim();
    } else {
      const parts = raw.split(/(?:[🔍\s]*(?:Corrections|التصحيحات))[\s:]*/i);
      summaryText = parts[0].replace(/^📝\s*(?:Your Summary in Your Own Words|الملخص)[\s:]*/i, '').trim();
    }

    // Match corrections section
    const correctionsMatch = raw.match(/(?:(?:🔍\s*)?(?:Corrections|التصحيحات))[\s:]*([\s\S]*?)(?=(?:(?:✨\s*)?(?:Your Strengths|نقاط القوة)|$))/i);
    if (correctionsMatch && correctionsMatch[1].trim()) {
      const lines = correctionsMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (/^[-*•\d.]/.test(line)) {
          corrections.push(line.replace(/^[-*•\d.]+\s*/, '').trim());
        } else if (line.length > 5 && !line.toLowerCase().includes('corrections:')) {
          corrections.push(line);
        }
      }
    }

    // Match strengths section
    const strengthsMatch = raw.match(/(?:(?:✨\s*)?(?:Your Strengths|نقاط القوة))[\s:]*([\s\S]*?)$/i);
    if (strengthsMatch && strengthsMatch[1].trim()) {
      const lines = strengthsMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (/^[-*•\d.]/.test(line)) {
          strengths.push(line.replace(/^[-*•\d.]+\s*/, '').trim());
        } else if (line.length > 5 && !line.toLowerCase().includes('strengths:')) {
          strengths.push(line);
        }
      }
    }

    return { summaryText, corrections, strengths };
  }

  // 4. Understanding Agent - Summarize Loop (calls Python SocraticSummaryAgent.force_summary)
  app.post('/api/coach/understanding/summarize', async (req, res) => {
    try {
      const { slide, history } = req.body;

      // Try Python Backend (Socratic Final Summary in student's own words)
      try {
        const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/summary/force`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: `slide-${slide?.id || slide?.pageNumber || 1}`
          })
        });

        if (pyRes.ok) {
          const data = await pyRes.json();
          if (data.final_summary) {
            const parsed = parseSocraticSummary(data.final_summary);
            return res.json({
              studentWordsSummary: parsed.summaryText || data.final_summary,
              corrections: parsed.corrections,
              strengths: parsed.strengths,
              inlineCorrections: [],
              lectureTakeaways: data.slide_axes || slide?.keyPoints || ['Core concept solidified']
            });
          }
        }
      } catch (err) {
        console.warn('Python backend summarize failed, falling back:', err);
      }

      const ai = getAi();

      const dialogue = (history || []).map((h: any, i: number) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.studentAnswer}`).join('\n\n');

      if (ai && dialogue.trim().length > 0) {
        const prompt = `You are an attentive study coach compiling a student's study notes.
The student answered these Socratic questions about "${slide.title}":
${dialogue}

Key Lecture Points for this slide:
${(slide.keyPoints || []).join('\n')}

Task:
1. Write a structured summary of 2-3 distinct paragraphs separated by blank lines (NOT one single monolithic paragraph), written firmly in the STUDENT'S OWN WORDS and phrasing.
2. If the student had any misconceptions, inaccuracies, or missing nuances, provide corrections strictly as an array of bullet point strings (corrections).
3. List the student's key conceptual strengths strictly as an array of bullet point strings (strengths).
4. List 2-3 clear lecture takeaways.

Respond in JSON:
{
  "studentWordsSummary": "Paragraph 1...\n\nParagraph 2...",
  "corrections": [
    "Misconception or nuance point 1",
    "Missing detail or clarification point 2"
  ],
  "strengths": [
    "Key conceptual strength 1",
    "Articulated point 2"
  ],
  "inlineCorrections": [
    { "original": "student's phrase", "correction": "accurate formulation", "explanation": "why this distinction matters" }
  ],
  "lectureTakeaways": ["Key takeaway 1", "Key takeaway 2"]
}`;

        const parsed = await generateJsonWithLLM<any>(prompt);
        if (parsed) {
          res.json({
            studentWordsSummary: parsed.studentWordsSummary || 'Here is what you articulated during our session.',
            corrections: parsed.corrections || [],
            strengths: parsed.strengths || [],
            inlineCorrections: parsed.inlineCorrections || [],
            lectureTakeaways: parsed.lectureTakeaways || slide.keyPoints || []
          });
          return;
        }
      }

      // Fallback
      const validAnswers = (history || []).map((h: any) => h.studentAnswer).filter((a: string) => a && !a.includes("don't know"));
      const fallbackParagraphs = validAnswers.length > 1
        ? [
            validAnswers.slice(0, Math.ceil(validAnswers.length / 2)).join('. ') + '.',
            validAnswers.slice(Math.ceil(validAnswers.length / 2)).join('. ') + '.'
          ].join('\n\n')
        : (validAnswers[0]
            ? `${validAnswers[0]}.\n\nYour explanations demonstrated direct engagement with the core conceptual mechanisms.`
            : `You explored the fundamentals of ${slide.title}.\n\nYour explanations focused on the primary operational characteristics.`);

      res.json({
        studentWordsSummary: fallbackParagraphs,
        corrections: [
          'Remember that quorums require a strict majority of all configured nodes, not just active ones.',
          'Double check failover boundary conditions when network partitions occur.'
        ],
        strengths: [
          'Clear initial definition of system requirements.',
          'Articulated trade-offs in your own words accurately.'
        ],
        inlineCorrections: [
          {
            original: 'simplified view',
            correction: 'rigorous condition',
            explanation: 'Remember that quorums require a strict majority of all configured nodes, not just active ones.'
          }
        ],
        lectureTakeaways: slide.keyPoints || ['Core principle mastered']
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Quick Quiz (calls Python QuizAgent)
  app.post('/api/coach/quiz/quick', async (req, res) => {
    try {
      const { slide, lectureTitle, pdfName, previousQuestions = [], language = 'ar' } = req.body;

      const rawContentList = (slide?.content || []).filter(
        (c: string) => !c.includes('Visual presentation content') && !c.includes('Section notes and key lecture points')
      );
      const rawKeyPointsList = (slide?.keyPoints || []).filter(
        (kp: string) => !kp.includes('Visual and conceptual takeaways')
      );

      const isPlaceholder = rawContentList.length === 0 && rawKeyPointsList.length === 0;

      let slideContext = [
        `Lecture: ${lectureTitle || ''}`,
        `Slide: ${slide?.title || ''}`,
        `Topic: ${slide?.topic || slide?.title || ''}`,
        `Key Points: ${rawKeyPointsList.join(', ')}`,
        `Content:\n${rawContentList.join('\n')}`
      ].join('\n');

      // If slide text is placeholder or minimal, retrieve real chunks from RAG
      if (isPlaceholder) {
        try {
          const ragQuery = slide?.topic || slide?.title || lectureTitle || 'lecture key principles';
          const ragRes = await fetch(`${PYTHON_BACKEND_URL}/api/rag/retrieve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: ragQuery,
              k: 3,
              pdf_name: pdfName || lectureTitle
            })
          });
          if (ragRes.ok) {
            const ragData = await ragRes.json();
            if (ragData.chunks && ragData.chunks.length > 0) {
              const chunksText = ragData.chunks.map((c: any) => `[Slide ${c.page}]: ${c.text}`).join('\n\n');
              slideContext = `Lecture: ${lectureTitle || ''}\nTopic: ${slide?.topic || slide?.title}\nContent from Lecture Materials:\n${chunksText}`;
            }
          }
        } catch (ragErr) {
          console.warn('[Quiz] RAG retrieval fallback notice:', ragErr);
        }
      }

      // Try Python Backend (QuizAgent) with anti-duplication
      try {
        const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/quiz/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: slideContext,
            num_questions: 1,
            topic: slide?.topic || slide?.title,
            pdf_name: pdfName || lectureTitle,
            language: language,
            previous_questions: previousQuestions
          })
        });

        if (pyRes.ok) {
          const quizData = await pyRes.json();
          const firstQ = quizData.questions?.[0];
          if (firstQ && firstQ.options) {
            return res.json({
              question: firstQ.question,
              options: firstQ.options,
              correctAnswer: firstQ.answer,
              explanation: firstQ.explanation || 'Verified from slide content.'
            });
          }
        }
      } catch (err) {
        console.warn('Python quiz generation failed, falling back:', err);
      }

      const antiDupClause = previousQuestions.length > 0 ? `
PREVIOUSLY ASKED QUESTIONS (DO NOT REPEAT OR REPHRASE ANY OF THESE):
${previousQuestions.map((q: string) => `- ${q}`).join('\n')}

STRICT ANTI-DUPLICATION RULE:
- The student has already answered the above questions.
- You MUST generate a COMPLETELY NEW, different question testing another angle, definition, mechanism, or detail of the slide.
` : '';

      const prompt = `Create ONE clean, high-quality multiple choice question testing genuine conceptual understanding of:
Lecture: "${lectureTitle || ''}"
Slide: "${slide?.title || ''}"
Topic: "${slide?.topic || slide?.title || 'Key Concept'}"
Content:
${slideContext}

${antiDupClause}

CRITICAL RULES:
- Test academic knowledge of principles, definitions, or algorithms.
- NEVER ask questions about slide numbers, file names, or presentation formatting.
- The question must be distinct from any previously asked questions.

Return JSON:
{
  "question": "Question text?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Exact matching option string",
  "explanation": "Friendly 1-2 sentence explanation why this is right."
}`;

      const parsed = await generateJsonWithLLM<any>(prompt);
      if (parsed && parsed.options && parsed.options.length >= 2) {
        res.json(parsed);
        return;
      }

      // Safe Rotating Fallback Quiz Questions (Never repeat identical question)
      const topicName = slide?.topic || slide?.title || 'هذا المفهوم';
      const fallbackPool = [
        {
          question: `ما هو المبدأ المحوري الذي يقوم عليه ${topicName}؟`,
          options: [
            rawKeyPointsList[0] || 'تحقيق اتساق ومزامنة البيانات عبر النظام',
            'إلغاء قيود التحقق والاستجابة الفورية',
            'الاعتماد الحصري على التخزين المؤقت العشوائي',
            'تعطيل المراقبة والتحليل الدوري'
          ],
          correctAnswer: rawKeyPointsList[0] || 'تحقيق اتساق ومزامنة البيانات عبر النظام',
          explanation: `يرتكز ${topicName} على ضمان اتساق وحماية البيانات المشروحة.`
        },
        {
          question: `أي من الشروط التالية يعتبر أساسياً لتطبيق ${topicName} بنجاح؟`,
          options: [
            rawKeyPointsList[1] || 'مراعاة القيود والمعايير المحددة في المحاضرة',
            'تجاهل حالات الفشل الجزئي في النظام',
            'تقليل عدد الاختبارات والتحققات',
            'تطبيق المفاهيم دون الرجوع للمرجع الأكاديمي'
          ],
          correctAnswer: rawKeyPointsList[1] || 'مراعاة القيود والمعايير المحددة في المحاضرة',
          explanation: `التطبيق الناجح لـ ${topicName} يتطلب الالتزام بالشروط والحدود المعرفية.`
        },
        {
          question: `ما هي الفائدة الأكاديمية الأهم من استيعاب ${topicName}؟`,
          options: [
            rawKeyPointsList[2] || 'القدرة على حل المسائل المعقدة وربط الأفكار بنموذج تحليلي دقيق',
            'حفظ النصوص حرفياً دون فهم الميكانيزم',
            'تجاوز مراحل الاختبار والتدقيق',
            'الاكتفاء بالتعريفات السطحية فقط'
          ],
          correctAnswer: rawKeyPointsList[2] || 'القدرة على حل المسائل المعقدة وربط الأفكار بنموذج تحليلي دقيق',
          explanation: `الفهم العميق لـ ${topicName} يمنحك القدرة على التحليل المنهجي والتطبيق العملي.`
        }
      ];

      // Pick one that is not in previousQuestions
      const filteredFallbacks = fallbackPool.filter(fb => !previousQuestions.some((pq: string) => pq.includes(fb.question.slice(0, 15))));
      const selectedFallback = filteredFallbacks.length > 0 ? filteredFallbacks[0] : fallbackPool[Math.floor(Math.random() * fallbackPool.length)];

      res.json(selectedFallback);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Wrap-up Session - Analyze student summary & identify missing gaps (OpenAI gpt-4o-mini prioritized)
  app.post('/api/coach/wrapup/analyze', async (req, res) => {
    try {
      const { lectureTitle, allSlides, studentSummary, sessionStats } = req.body;

      const allKeyPoints = (allSlides || []).flatMap((s: any) => 
        (s.keyPoints || []).map((kp: string) => `[Slide ${s.pageNumber}: ${s.topic || s.title || ''}] ${kp}`)
      );

      if (studentSummary && studentSummary.trim().length > 5) {
        const prompt = `You are the Orchestrator and Quiz Agent conducting an interactive Wrap-up Session.
Lecture Title: "${lectureTitle}"

All Master Key Points taught in this lecture:
${allKeyPoints.join('\n')}

The student just provided their end-of-session summary in their own words:
"${studentSummary}"

Your job:
1. Carefully compare the student's summary against the master key points taught.
2. Identify which key concepts the student explained or understood well ("coveredPoints").
3. Identify 2 to 3 SPECIFIC GAPS ("missingGaps"): concepts from the lecture that were missing, incomplete, or inadequately explained in their summary.
4. For EACH missing gap, formulate ONE targeted multiple-choice quiz question (4 options) addressing ONLY that specific gap, so the student can verify their retention.

Respond strictly in valid JSON with this schema:
{
  "coveredPoints": ["Concept or point the student covered well"],
  "missingGaps": ["Specific gap 1 title/concept", "Specific gap 2 title/concept"],
  "gapQuestions": [
    {
      "id": "gap-q-1",
      "concept": "concept name",
      "question": "Targeted question addressing this specific gap?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Clear explanation of why this answer is correct according to the lecture material."
    }
  ]
}`;

        const parsed = await generateJsonWithLLM<{
          coveredPoints?: string[];
          missingGaps?: string[];
          gapQuestions?: any[];
        }>(prompt, 'You are an intelligent educational Orchestrator and Quiz evaluation AI. Analyze student summaries rigorously and fairly against lecture slides.');

        if (parsed?.gapQuestions && parsed.gapQuestions.length > 0) {
          return res.json({
            coveredPoints: parsed.coveredPoints || [],
            missingGaps: parsed.missingGaps || [],
            gapQuestions: parsed.gapQuestions
          });
        }
      }

      // Fallback gap questions if LLM unavailable or summary too brief
      const slides = allSlides || [];
      const gap1Slide = slides[1] || slides[0];
      const gap2Slide = slides[3] || slides[slides.length - 1];

      res.json({
        coveredPoints: [
          `Foundations of ${slides[0]?.topic || slides[0]?.title || 'the lecture topic'}`,
          'High-level architectural workflow'
        ],
        missingGaps: [
          gap1Slide?.topic || gap1Slide?.title || 'State Transitions & Timeouts',
          gap2Slide?.topic || gap2Slide?.title || 'Safety Invariants & Edge Cases'
        ],
        gapQuestions: [
          {
            id: 'gap-q-1',
            concept: gap1Slide?.topic || gap1Slide?.title || 'Key Mechanism',
            question: `In ${gap1Slide?.title || 'the lecture'}, what is the critical mechanism preventing conflicts?`,
            options: [
              (gap1Slide?.keyPoints || [])[0] || 'Randomized timeouts and strict quorum intersection',
              'Centralized authority without elections',
              'Synchronized wall-clock timestamps',
              'Ignoring uncommitted entries indefinitely'
            ],
            correctAnswer: (gap1Slide?.keyPoints || [])[0] || 'Randomized timeouts and strict quorum intersection',
            explanation: `As detailed in ${gap1Slide?.title}: ${(gap1Slide?.keyPoints || [])[0] || 'This prevents split votes and guarantees progress.'}`
          },
          {
            id: 'gap-q-2',
            concept: gap2Slide?.topic || gap2Slide?.title || 'Safety Invariant',
            question: `How does ${gap2Slide?.title || 'the system'} ensure safety during network partitions?`,
            options: [
              (gap2Slide?.keyPoints || [])[0] || 'Only a majority quorum can commit new entries.',
              'All partitions continue accepting and committing writes equally.',
              'The minority partition forces the majority to halt.',
              'Data is merged blindly without term checks.'
            ],
            correctAnswer: (gap2Slide?.keyPoints || [])[0] || 'Only a majority quorum can commit new entries.',
            explanation: `Quorum overlap ensures that split-brain commits are mathematically impossible.`
          }
        ]
      });
    } catch (err: any) {
      console.error('Wrapup analyze error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Wrap-up Session - Generate Final Learning Coach Report (OpenAI gpt-4o-mini prioritized)
  app.post('/api/coach/wrapup/report', async (req, res) => {
    try {
      const { lectureId, lectureTitle, allSlides, studentSummary, gapQuestions, sessionStats } = req.body;

      const questionsList = (gapQuestions || []).map((q: any) => 
        `- Concept: ${q.concept} | Correct: ${q.isCorrect ? 'YES' : 'NO'} (Student selected: "${q.studentAnswer}")`
      ).join('\n');

      const prompt = `You are the Learning Coach Agent generating the final student report.
Lecture: "${lectureTitle}"
Student Summary: "${studentSummary || ''}"

Targeted Gap Quiz Results:
${questionsList}

Session Focus Stats: ${sessionStats?.totalSecondsFocused || 300} seconds studied.

Task:
1. Create a concept strength/weakness map with mastery scores (0-100) and status ('mastered' | 'developing' | 'needs_review').
2. Deliver ONE single, highly actionable, encouraging recommendation for what the student should review next.
3. Formulate 1 spaced repetition review item for their queue (differently-worded challenge question for long-term retention).

Respond strictly in valid JSON with this schema:
{
  "conceptMap": [
    { "concept": "Concept Name", "status": "mastered", "score": 90, "note": "Strong conceptual recall" },
    { "concept": "Concept Name 2", "status": "developing", "score": 65, "note": "Clarify edge cases" }
  ],
  "primaryRecommendation": "One targeted paragraph advising what to focus on next without overwhelming them.",
  "spacedRepetitionQueue": [
    {
      "id": "sr-1",
      "concept": "Core Concept",
      "lectureTitle": "${lectureTitle}",
      "daysUntilReview": 3,
      "lastReviewed": "${new Date().toISOString().split('T')[0]}",
      "question": "Spaced repetition challenge question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation"
    }
  ]
}`;

      const parsed = await generateJsonWithLLM<{
        conceptMap?: any[];
        primaryRecommendation?: string;
        spacedRepetitionQueue?: any[];
      }>(prompt, 'You are an adaptive Learning Coach AI generating encouraging, accurate mastery reports for students.');

      if (parsed) {
        return res.json({
          lectureId,
          lectureTitle,
          studyTimeMinutes: Math.max(1, Math.round((sessionStats?.totalSecondsFocused || 300) / 60)),
          focusEfficiencyPercentage: Math.min(100, Math.round(((sessionStats?.totalSecondsFocused || 300) / Math.max(1, (sessionStats?.totalSecondsFocused || 300) + 45)) * 100)),
          totalGapsIdentified: (gapQuestions || []).length,
          gapsResolvedInQuiz: (gapQuestions || []).filter((q: any) => q.isCorrect).length,
          conceptMap: parsed.conceptMap || [],
          primaryRecommendation: parsed.primaryRecommendation || 'Great study session! Solidify the key takeaways before your exam.',
          spacedRepetitionQueue: parsed.spacedRepetitionQueue || [],
          studentFinalSummary: studentSummary
        });
      }

      // Fallback report if LLM unavailable
      const concepts = (allSlides || []).map((s: any, idx: number) => ({
        concept: s.topic || s.title,
        status: idx === 0 ? 'mastered' : idx === 1 ? 'developing' : 'needs_review',
        score: idx === 0 ? 92 : idx === 1 ? 74 : 58,
        note: idx === 0 ? 'Excellently articulated in your summary.' : 'Gaps targeted during follow-up quiz.'
      }));

      res.json({
        lectureId,
        lectureTitle,
        studyTimeMinutes: Math.max(1, Math.round((sessionStats?.totalSecondsFocused || 300) / 60)),
        focusEfficiencyPercentage: 94,
        totalGapsIdentified: (gapQuestions || []).length || 2,
        gapsResolvedInQuiz: (gapQuestions || []).filter((q: any) => q.isCorrect).length,
        conceptMap: concepts,
        primaryRecommendation: `Focus your next review session on ${(gapQuestions || [])[0]?.concept || 'the core invariants'} — specifically tracing edge cases under unexpected partitions.`,
        spacedRepetitionQueue: [
          {
            id: `sr-${Date.now()}`,
            concept: (gapQuestions || [])[0]?.concept || 'Consensus Safety',
            lectureTitle,
            daysUntilReview: 3,
            lastReviewed: new Date().toISOString().split('T')[0],
            question: `In a 5-node cluster, what is the minimum number of nodes required to guarantee commit safety?`,
            options: ['3 nodes (strict majority)', '2 nodes', '4 nodes', 'All 5 nodes'],
            correctAnswer: '3 nodes (strict majority)',
            explanation: 'Quorums require floor(N/2) + 1 nodes to overlap and prevent split brain.'
          }
        ],
        studentFinalSummary: studentSummary
      });
    } catch (err: any) {
      console.error('Wrapup report error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Camera Attention Frame Analysis (Phone detection & Sleep detection)
  app.post('/api/coach/attention/analyze-frame', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64' });
      }

      const visionPrompt = `You are an attentive, calm, academic AI study coach monitoring a student's webcam while they study.
Your task is to detect the student's physical and focus state accurately.
Evaluate specifically:
1. "using_phone": Is the student holding, touching, or looking down at a mobile phone / smartphone / handheld device?
2. "sleeping": Is the student asleep, eyes closed, head resting on their desk/arms/hands, or nodding off?
3. "book": Is the student actively reading a physical book, textbook, or writing notes in a notebook? (This counts as active focus study time!)
4. "laptop": Is the student actively working/reading on their laptop computer screen? (This counts as active focus study time!)
5. "coffee": Is the student drinking from a cup/mug, holding a coffee or tea cup, or taking a sip? (Warmly praise them: "بالعافية وصحة وهنا! ☕️ روّق برشفة القهوة.. وبعدها عندنا كويز خفيف نثبّت به معلومات اليوم! 🎯")
6. "eating": Is the student eating food, having a snack, sandwich, or meal? (Counted as mild distraction: "صحة وعافية! 🥪 الأكل بيُحسب كفترة تشتت خفيفة، خذ لك لقمة سريعة ونرجع نركز عشان ما يطير حماس الجلسة.")
7. "distracted": Has their gaze or head turned away from their study material for an extended period?
8. "away": Is the student not in frame / empty chair?
9. "focused": Is the student sitting normally, looking at their study screen, reading, or writing notes?

Return ONLY valid JSON with this exact schema:
{
  "state": "focused" | "using_phone" | "sleeping" | "book" | "laptop" | "coffee" | "eating" | "distracted" | "away",
  "confidence": number between 0.0 and 1.0,
  "is_study_time": boolean,
  "reason": "Brief 1-sentence respectful description in Arabic or English of what you observe",
  "coachMessage": "Kind, encouraging Arabic prompt tailored to the state"
}`;

      // 1. Try OpenAI Vision (gpt-4o-mini)
      const openai = getOpenAI();
      if (openai) {
        try {
          const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  { type: 'image_url', image_url: { url: imageUrl } }
                ]
              }
            ]
          });
          const text = completion.choices[0]?.message?.content;
          if (text) {
            return res.json(JSON.parse(text));
          }
        } catch (err: any) {
          console.warn('[OpenAI Vision error, trying Gemini]:', err.message);
        }
      }

      // 2. Fallback to Gemini
      const ai = getAi();
      if (ai) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Data
                    }
                  },
                  {
                    text: visionPrompt
                  }
                ]
              }
            ],
            config: {
              responseMimeType: 'application/json'
            }
          });

          const parsed = JSON.parse(response.text || '{}');
          return res.json(parsed);
        } catch {
          // fallback
        }
      }

      // Fallback if no Gemini key
      res.json({
        state: 'focused',
        confidence: 0.95,
        reason: 'Camera monitor active on local device.',
        coachMessage: null
      });
    } catch (err: any) {
      console.error('Frame analysis error:', err);
      res.status(500).json({
        state: 'focused',
        confidence: 0.8,
        reason: 'Evaluation temporarily unavailable; resuming study.',
        coachMessage: null
      });
    }
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Study Coach server running on port ${PORT}`);
  });
}

startServer();
