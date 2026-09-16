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
    // Set worker source if available
    try {
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
      }
    } catch {
      // ignore
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
        // High DPI rendering (scale 2.2) ensures text, equations, and diagrams remain razor sharp
        const viewport = page.getViewport({ scale: 2.2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          await (page.render as any)({ canvas, canvasContext: ctx, viewport }).promise;
          pageImageUrl = canvas.toDataURL('image/jpeg', 0.92);
        }
      } catch (renderErr) {
        console.warn('Canvas rendering for PDF page skipped:', renderErr);
      }

      // 2. Extract text for AI Coach analysis
      const textContent = await page.getTextContent();
      const rawText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();

      const lines = rawText
        .split(/\s{2,}|\.\s+|\n+/)
        .map(l => l.trim())
        .filter(l => l.length > 4);

      const pageTitle = lines[0] ? lines[0].slice(0, 65) : `Page ${i}`;
      const subtitle = lines[1] && lines[1].length < 80 ? lines[1] : undefined;
      const content = lines.slice(subtitle ? 2 : 1, 8);
      const keyPoints = content.slice(0, 3);

      slides.push({
        id: `pdf-page-${i}`,
        pageNumber: i,
        title: pageTitle || `Section ${i}`,
        subtitle,
        content: content.length > 0 ? content : [rawText ? rawText.slice(0, 300) : `Reading visual page ${i} from original PDF.`],
        keyPoints: keyPoints.length > 0 ? keyPoints : [`Key visual and theoretical elements from page ${i}`],
        topic: pageTitle || `Page ${i}`,
        densityScore: Math.min(5, Math.max(2, Math.round(lines.length / 3))),
        pageImageUrl
      });
    }

    if (slides.length === 0) {
      throw new Error('No readable text in PDF');
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
    
    const slides: Slide[] = (chunks.length > 0 ? chunks : [text]).slice(0, 15).map((chunk, idx) => {
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      const pageTitle = lines[0]?.replace(/^[#\-\s]+/, '').slice(0, 60) || `Slide ${idx + 1}`;
      const content = lines.slice(1, 6);
      return {
        id: `slide-${idx + 1}`,
        pageNumber: idx + 1,
        title: pageTitle,
        content: content.length > 0 ? content : ['Section notes and key lecture points.'],
        keyPoints: content.slice(0, 2),
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

