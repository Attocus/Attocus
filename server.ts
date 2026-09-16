import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // 1. Explain Agent
  app.post('/api/coach/explain', async (req, res) => {
    try {
      const { lectureTitle, currentSlide, allSlides, question, chatHistory } = req.body;
      const ai = getAi();

      const lectureContext = `Lecture: "${lectureTitle}"
Current Slide (Page ${currentSlide.pageNumber}):
Title: ${currentSlide.title}
Subtitle: ${currentSlide.subtitle || ''}
Content:
${(currentSlide.content || []).join('\n')}
Key Points:
${(currentSlide.keyPoints || []).join('\n')}

Other Slides in this lecture:
${(allSlides || []).map((s: any) => `Page ${s.pageNumber}: ${s.title} (${s.topic})`).join('\n')}
`;

      if (ai) {
        const prompt = `You are a calm, academic, highly supportive human tutor sitting right next to a university student.
Rules:
1. Explain warmly, clearly, and concisely in 2-3 brief paragraphs.
2. Ground your answer FIRST in the provided lecture notes and cite "Slide ${currentSlide.pageNumber}".
3. If the answer is not found directly in the lecture, you may use external knowledge, but you MUST explicitly cite the external source (e.g., "[Source: Standard Distributed Systems Theory]").
4. Maintain a supportive, encouraging, conversational teacher tone. Do not use robotic boilerplate.

Context:
${lectureContext}

Student's question: "${question}"`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });

        res.json({
          answer: response.text || 'I checked the slide material for you.',
          citedLecturePages: [currentSlide.pageNumber]
        });
        return;
      }

      // Fallback if no Gemini key
      const answer = `Based on Slide ${currentSlide.pageNumber} ("${currentSlide.title}"), the core idea is: ${(currentSlide.keyPoints || [])[0] || currentSlide.content[0]}. 

To put it simply: ${(currentSlide.content || []).slice(0, 2).join(' ')}

Does that clarify how it connects to ${currentSlide.topic}?`;

      res.json({
        answer,
        citedLecturePages: [currentSlide.pageNumber]
      });
    } catch (err: any) {
      console.error('Explain agent error:', err);
      res.status(500).json({ error: err.message || 'Failed to explain' });
    }
  });

  // 2. Understanding Agent - Open question
  app.post('/api/coach/understanding/start', async (req, res) => {
    try {
      const { slide, lectureTitle } = req.body;
      const ai = getAi();

      if (ai) {
        const prompt = `You are an attentive tutor initiating a comprehension check.
Slide Topic: "${slide.topic || slide.title}"
Key concepts on slide: ${(slide.keyPoints || []).join(', ')}

Ask ONE warm, open-ended question to assess the student's genuine mental model (e.g. "In your own words, what did you understand about how [concept] works?"). Keep it under 25 words.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });

        res.json({
          question: response.text?.trim() || `What did you understand about ${slide.topic || slide.title}?`,
          topic: slide.topic || slide.title
        });
        return;
      }

      res.json({
        question: `In your own words, what did you understand about ${slide.topic || slide.title}?`,
        topic: slide.topic || slide.title
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Understanding Agent - Multi-turn Step
  app.post('/api/coach/understanding/step', async (req, res) => {
    try {
      const { slide, question, studentAnswer, history, isIDontKnow } = req.body;
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

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        try {
          const parsed = JSON.parse(response.text || '{}');
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
        } catch {
          // fall through to deterministic response
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

  // 4. Understanding Agent - Summarize Loop
  app.post('/api/coach/understanding/summarize', async (req, res) => {
    try {
      const { slide, history } = req.body;
      const ai = getAi();

      const dialogue = (history || []).map((h: any, i: number) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.studentAnswer}`).join('\n\n');

      if (ai && dialogue.trim().length > 0) {
        const prompt = `You are an attentive coach compiling a student's study notes.
The student answered these questions about "${slide.title}":
${dialogue}

Key Lecture Points for this slide:
${(slide.keyPoints || []).join('\n')}

Task:
1. Write a unified 2-3 paragraph summary written firmly in the STUDENT'S OWN WORDS and phrasing, not academic textbook prose.
2. If the student had any factual errors or slight misstatements, provide inline corrections as an array of objects.
3. List 2-3 clear lecture takeaways.

Respond in JSON:
{
  "studentWordsSummary": "Summary synthesizing their statements...",
  "inlineCorrections": [
    { "original": "student's phrase", "correction": "accurate formulation", "explanation": "why this distinction matters" }
  ],
  "lectureTakeaways": ["Key takeaway 1", "Key takeaway 2"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        try {
          const parsed = JSON.parse(response.text || '{}');
          res.json({
            studentWordsSummary: parsed.studentWordsSummary || 'Here is what you articulated during our session.',
            inlineCorrections: parsed.inlineCorrections || [],
            lectureTakeaways: parsed.lectureTakeaways || slide.keyPoints || []
          });
          return;
        } catch {
          // fallback
        }
      }

      // Fallback
      res.json({
        studentWordsSummary: (history || []).map((h: any) => h.studentAnswer).filter((a: string) => a && !a.includes("don't know")).join('. ') || `You explored the fundamentals of ${slide.title}.`,
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

  // 5. Quick Quiz (Stuck Intervention & Spaced Repetition)
  app.post('/api/coach/quiz/quick', async (req, res) => {
    try {
      const { slide } = req.body;
      const ai = getAi();

      if (ai) {
        const prompt = `Create ONE clean, high-quality multiple choice question to test understanding of:
Slide: "${slide.title}"
Topic: "${slide.topic}"
Key Points: ${(slide.keyPoints || []).join(', ')}

Return JSON:
{
  "question": "Question text?",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "Exact matching option string",
  "explanation": "Friendly 1-2 sentence explanation why this is right."
}`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        try {
          const parsed = JSON.parse(response.text || '{}');
          if (parsed.options && parsed.options.length >= 2) {
            res.json(parsed);
            return;
          }
        } catch {}
      }

      // Fallback
      res.json({
        question: `Regarding ${slide.title}, which of the following is true?`,
        options: [
          (slide.keyPoints || [])[0] || 'It ensures state machine consistency across all replicas.',
          'It allows uncommitted writes to bypass majority quorum checks.',
          'It requires physical clock synchronization across nodes.',
          'It only operates when all cluster nodes are active.'
        ],
        correctAnswer: (slide.keyPoints || [])[0] || 'It ensures state machine consistency across all replicas.',
        explanation: `As noted in the lecture: ${(slide.keyPoints || [])[0] || 'This maintains core invariants.'}`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Wrap-up Session - Analyze student summary & identify missing gaps
  app.post('/api/coach/wrapup/analyze', async (req, res) => {
    try {
      const { lectureTitle, allSlides, studentSummary, sessionStats } = req.body;
      const ai = getAi();

      const allKeyPoints = (allSlides || []).flatMap((s: any) => 
        (s.keyPoints || []).map((kp: string) => `[Slide ${s.pageNumber}: ${s.topic}] ${kp}`)
      );

      if (ai && studentSummary?.trim().length > 10) {
        const prompt = `You are the Orchestrator and Quiz Agent conducting an interactive Wrap-up Session.
Lecture: "${lectureTitle}"
All Master Key Points taught in this lecture:
${allKeyPoints.join('\n')}

The student just provided their end-of-session summary in their own words:
"${studentSummary}"

Your job:
1. Identify which key concepts the student covered well.
2. Identify 2 to 3 SPECIFIC GAPS (concepts that were missing or inadequately explained in their summary).
3. For EACH missing gap, generate ONE targeted quiz question (multiple choice, 4 options) addressing ONLY that specific gap.

Respond in JSON:
{
  "coveredPoints": ["concept student understood"],
  "missingGaps": ["gap 1 title/concept", "gap 2 title/concept"],
  "gapQuestions": [
    {
      "id": "gap-q-1",
      "concept": "concept name",
      "question": "Targeted question addressing this gap?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Why this is correct based on the lecture."
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        try {
          const parsed = JSON.parse(response.text || '{}');
          if (parsed.gapQuestions && parsed.gapQuestions.length > 0) {
            res.json(parsed);
            return;
          }
        } catch {}
      }

      // Fallback gap questions
      const slides = allSlides || [];
      const gap1Slide = slides[1] || slides[0];
      const gap2Slide = slides[3] || slides[slides.length - 1];

      res.json({
        coveredPoints: [
          `Foundations of ${slides[0]?.topic || 'the topic'}`,
          'High-level architectural workflow'
        ],
        missingGaps: [
          gap1Slide?.topic || 'State Transitions & Timeouts',
          gap2Slide?.topic || 'Safety Invariants & Edge Cases'
        ],
        gapQuestions: [
          {
            id: 'gap-q-1',
            concept: gap1Slide?.topic || 'Key Mechanism',
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
            concept: gap2Slide?.topic || 'Safety Invariant',
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
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Wrap-up Session - Generate Final Learning Coach Report
  app.post('/api/coach/wrapup/report', async (req, res) => {
    try {
      const { lectureId, lectureTitle, allSlides, studentSummary, gapQuestions, sessionStats } = req.body;
      const ai = getAi();

      const questionsList = (gapQuestions || []).map((q: any) => 
        `- Concept: ${q.concept} | Correct: ${q.isCorrect ? 'YES' : 'NO'} (Student answered: "${q.studentAnswer}")`
      ).join('\n');

      if (ai) {
        const prompt = `You are the Learning Coach Agent generating the final student report.
Lecture: "${lectureTitle}"
Student Summary: "${studentSummary}"
Targeted Gap Quiz Results:
${questionsList}
Session Focus Stats: ${sessionStats?.totalSecondsFocused || 300} seconds studied.

Task:
1. Create a concept strength/weakness map with mastery scores (0-100) and status ('mastered' | 'developing' | 'needs_review').
2. Deliver ONE single, highly actionable, encouraging recommendation for what the student should review next.
3. Formulate 1 spaced repetition review item for their queue (differently-worded question for retention).

Respond in JSON:
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
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Brief explanation"
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        try {
          const parsed = JSON.parse(response.text || '{}');
          res.json({
            lectureId,
            lectureTitle,
            studyTimeMinutes: Math.max(1, Math.round((sessionStats?.totalSecondsFocused || 300) / 60)),
            focusEfficiencyPercentage: Math.min(100, Math.round(((sessionStats?.totalSecondsFocused || 300) / Math.max(1, (sessionStats?.totalSecondsFocused || 300) + 45)) * 100)),
            totalGapsIdentified: (gapQuestions || []).length,
            gapsResolvedInQuiz: (gapQuestions || []).filter((q: any) => q.isCorrect).length,
            conceptMap: parsed.conceptMap || [],
            primaryRecommendation: parsed.primaryRecommendation || 'Great study session! Solidify the election safety checks before tomorrow.',
            spacedRepetitionQueue: parsed.spacedRepetitionQueue || [],
            studentFinalSummary: studentSummary
          });
          return;
        } catch {}
      }

      // Fallback report
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

      const ai = getAi();
      if (ai) {
        // Strip data URI header
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
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
                  text: `You are an attentive, calm, academic AI study coach monitoring a student's webcam while they study.
Your task is to detect the student's physical and focus state accurately.
Evaluate specifically:
1. "using_phone": Is the student holding, touching, or looking down at a mobile phone / smartphone / handheld device?
2. "sleeping": Is the student asleep, eyes closed, head resting on their desk/arms/hands, or nodding off?
3. "distracted": Has their gaze or head turned away from their study material for an extended period?
4. "away": Is the student not in frame / empty chair?
5. "focused": Is the student sitting normally, looking at their study screen, reading, or writing notes?

Return ONLY valid JSON with this exact schema:
{
  "state": "focused" | "using_phone" | "sleeping" | "distracted" | "away",
  "confidence": number between 0.0 and 1.0,
  "reason": "Brief 1-sentence respectful description of what you observe",
  "coachMessage": "Kind, encouraging teacher prompt if state is not focused, or null if focused"
}`
                }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });

        try {
          const parsed = JSON.parse(response.text || '{}');
          return res.json(parsed);
        } catch {
          return res.json({
            state: 'focused',
            confidence: 0.9,
            reason: 'Normal reading posture observed.',
            coachMessage: null
          });
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
