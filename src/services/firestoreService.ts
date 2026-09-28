import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  addDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lecture, PageAnnotationsMap, WrapUpReport } from '../types';

// ==========================================
// 1. User Profile & Global Study Stats
// ==========================================

export interface UserStudyStats {
  focusPoints?: number;
  todayMinutesStudied?: number;
  totalSessionsCompleted?: number;
  displayName?: string;
  email?: string;
}

export async function syncUserStatsToFirestore(uid: string, stats: UserStudyStats): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        ...stats,
        lastActiveAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] syncUserStats error:', err);
  }
}

export async function getUserStatsFromFirestore(uid: string): Promise<UserStudyStats | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserStudyStats;
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] getUserStats error:', err);
    return null;
  }
}

// ==========================================
// 2. Lectures Management
// ==========================================

export async function saveLectureToFirestore(uid: string, lecture: Lecture): Promise<void> {
  try {
    // 1. Register in root 'files' collection
    await fetch('/api/firestore/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: lecture.title,
        userId: uid || 'user_1',
        lectureId: lecture.id,
        totalPages: lecture.totalPages || lecture.slides.length
      })
    }).catch(() => { });

    // 2. Save lightweight lecture without base64 canvas images in user subcollection
    const cleanSlides = (lecture.slides || []).map(s => {
      const { pageImageUrl, ...rest } = s;
      return rest;
    });

    const lectureRef = doc(db, 'users', uid, 'lectures', lecture.id);
    await setDoc(
      lectureRef,
      {
        ...lecture,
        slides: cleanSlides,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    ).catch(() => { });
  } catch (err) {
    console.warn('[Firestore] saveLecture error:', err);
  }
}

export async function getLecturesFromFirestore(uid: string): Promise<Lecture[]> {
  try {
    const lecturesCol = collection(db, 'users', uid, 'lectures');
    const snap = await getDocs(lecturesCol);
    return snap.docs.map((docSnap) => docSnap.data() as Lecture);
  } catch (err) {
    console.warn('[Firestore] getLectures error:', err);
    return [];
  }
}

export async function deleteLectureFromFirestore(uid: string, lectureId: string): Promise<void> {
  try {
    const lectureRef = doc(db, 'users', uid, 'lectures', lectureId);
    await deleteDoc(lectureRef);

    // Also remove associated annotations
    const annotRef = doc(db, 'users', uid, 'annotations', lectureId);
    await deleteDoc(annotRef).catch(() => { });
  } catch (err) {
    console.warn('[Firestore] deleteLecture error:', err);
  }
}

export async function batchSaveInitialLectures(uid: string, lectures: Lecture[]): Promise<void> {
  try {
    for (const lecture of lectures) {
      await saveLectureToFirestore(uid, lecture);
    }
  } catch (err) {
    console.warn('[Firestore] batchSaveInitialLectures error:', err);
  }
}

// ==========================================
// 3. Slide Annotations (Pen & Highlighter)
// ==========================================

export async function saveAnnotationsToFirestore(
  uid: string,
  lectureId: string,
  pageAnnotations: PageAnnotationsMap
): Promise<void> {
  try {
    const annotRef = doc(db, 'users', uid, 'annotations', lectureId);
    await setDoc(
      annotRef,
      {
        lectureId,
        annotations: JSON.stringify(pageAnnotations),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] saveAnnotations error:', err);
  }
}

export async function getAnnotationsFromFirestore(
  uid: string,
  lectureId: string
): Promise<PageAnnotationsMap | null> {
  try {
    const annotRef = doc(db, 'users', uid, 'annotations', lectureId);
    const snap = await getDoc(annotRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.annotations) {
        return JSON.parse(data.annotations);
      }
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] getAnnotations error:', err);
    return null;
  }
}

// ==========================================
// 4. Study Sessions & Wrap-Up Reports
// ==========================================

export interface SavedSessionRecord {
  id?: string;
  lectureId: string;
  lectureTitle: string;
  report: WrapUpReport;
  sessionStats?: {
    totalSecondsFocused?: number;
  };
  createdAt?: any;
}

export async function saveSessionReportToFirestore(
  uid: string,
  lectureId: string,
  lectureTitle: string,
  report: WrapUpReport,
  sessionStats?: { totalSecondsFocused?: number },
  extraDetails?: {
    studentSummary?: string;
    coveredPoints?: string[];
    missingGaps?: string[];
    gapQuestions?: any[];
  }
): Promise<string | null> {
  try {
    // 1. Call Backend Firestore Admin API to write to root collections: 'sessions', 'summaries', 'quizzes', 'users'
    const res = await fetch('/api/firestore/wrapup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uid || 'dev_123',
        lectureId,
        lectureTitle,
        report,
        sessionStats: sessionStats || {},
        studentSummary: extraDetails?.studentSummary || report.studentFinalSummary || '',
        coveredPoints: extraDetails?.coveredPoints || [],
        missingGaps: extraDetails?.missingGaps || [],
        gapQuestions: extraDetails?.gapQuestions || []
      })
    });

    if (res.ok) {
      const data = await res.json();
      return data.sessionId;
    }
  } catch (err) {
    console.warn('[Firestore] saveSessionReport API error:', err);
  }

  // Fallback to client SDK write if online
  try {
    if (uid) {
      const sessionsCol = collection(db, 'users', uid, 'sessions');
      const docRef = await addDoc(sessionsCol, {
        lectureId,
        lectureTitle,
        report,
        sessionStats: sessionStats || {},
        createdAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch { }

  return null;
}

export async function getRecentSessionsFromFirestore(
  uid: string,
  limitCount = 10
): Promise<SavedSessionRecord[]> {
  try {
    const sessionsCol = collection(db, 'users', uid, 'sessions');
    const q = query(sessionsCol, orderBy('createdAt', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<SavedSessionRecord, 'id'>)
    }));
  } catch (err) {
    console.warn('[Firestore] getRecentSessions error:', err);
    return [];
  }
}

// ==========================================
// 5. Attention & Distraction Logs
// ==========================================

export interface AttentionLogEntry {
  lectureId: string;
  eventType: 'phone_detected' | 'sleeping' | 'away_from_desk' | 'tab_switched';
  timestamp: number;
  details?: string;
}

export async function logAttentionEventToFirestore(
  uid: string,
  event: AttentionLogEntry
): Promise<void> {
  try {
    const logsCol = collection(db, 'users', uid, 'attention_logs');
    await addDoc(logsCol, {
      ...event,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[Firestore] logAttentionEvent error:', err);
  }
}

// ==========================================
// 6. Contact Inquiries & Support Messages
// ==========================================

export interface ContactMessagePayload {
  name: string;
  email: string;
  category: 'academic' | 'feature' | 'support';
  message: string;
  userId?: string | null;
}

export async function saveContactMessageToFirestore(
  payload: ContactMessagePayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const contactCol = collection(db, 'contact_messages');
    const docRef = await addDoc(contactCol, {
      name: payload.name,
      email: payload.email,
      category: payload.category,
      message: payload.message,
      userId: payload.userId || null,
      status: 'unread',
      source: 'portfolio_contact_form',
      createdAt: serverTimestamp(),
      clientTimestamp: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('[Firestore] saveContactMessage error:', err);
    return { success: false, error: err?.message || 'Failed to save message' };
  }
}


// ==========================================
// 7. First-Time User Onboarding
// ==========================================

export const ONBOARDING_VERSION = 1;

export async function getOnboardingStatus(
  uid: string
): Promise<boolean> {
  const onboardingRef = doc(
    db,
    'users',
    uid,
    'onboarding',
    'mainTour'
  );

  const snapshot = await getDoc(onboardingRef);

  if (!snapshot.exists()) return false;

  const data = snapshot.data();

  return (
    data.completed === true &&
    data.version === ONBOARDING_VERSION
  );
}

export async function completeOnboarding(
  uid: string
): Promise<void> {
  const onboardingRef = doc(
    db,
    'users',
    uid,
    'onboarding',
    'mainTour'
  );

  await setDoc(
    onboardingRef,
    {
      completed: true,
      version: ONBOARDING_VERSION,
      completedAt: serverTimestamp()
    },
    { merge: true }
  );
}

// ==========================================
// 8. Student Quiz Questions & Spaced Repetition (Firebase Cloud Sync)
// ==========================================

export interface FirestoreReviewQuestion {
  id?: string;
  student_id: string;
  question: string;
  topic?: string;
  page?: number;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  created_at?: string;
  review_date?: string;
  days_interval?: number;
  days_remaining?: number;
  is_due?: boolean;
  status?: 'pending' | 'mastered';
  review_count?: number;
}

/**
 * Saves a missed quiz question directly to the student's personal review collection in Firestore.
 */
export async function saveScheduledQuestionForStudent(
  uid: string,
  questionData: Omit<FirestoreReviewQuestion, 'student_id'> & { days_interval?: number }
): Promise<string | null> {
  if (!uid) return null;
  const now = new Date();
  const interval = questionData.days_interval || 3;
  const reviewDate = new Date(now.getTime() + interval * 86400000).toISOString();

  const record: FirestoreReviewQuestion = {
    ...questionData,
    student_id: uid,
    status: 'pending',
    review_count: 0,
    created_at: now.toISOString(),
    review_date: reviewDate,
    days_interval: interval,
    days_remaining: interval,
    is_due: false
  };

  try {
    // 1. Save to user's personal subcollection: users/{uid}/scheduled_reviews
    const userReviewsCol = collection(db, 'users', uid, 'scheduled_reviews');
    const docRef = await addDoc(userReviewsCol, {
      ...record,
      createdAt: serverTimestamp()
    });

    // 2. Also register in root review_questions collection for multi-agent querying
    try {
      const rootReviewsCol = collection(db, 'review_questions');
      await addDoc(rootReviewsCol, {
        ...record,
        doc_id: docRef.id,
        createdAt: serverTimestamp()
      });
    } catch {}

    return docRef.id;
  } catch (err) {
    console.warn('[Firestore] saveScheduledQuestionForStudent error:', err);
    return null;
  }
}

/**
 * Retrieves all scheduled review questions for a specific student from Firestore.
 */
export async function getScheduledQuestionsForStudent(
  uid: string
): Promise<FirestoreReviewQuestion[]> {
  if (!uid) return [];
  const now = new Date();
  const results: FirestoreReviewQuestion[] = [];
  const seenIds = new Set<string>();

  try {
    // 1. Fetch from user's personal subcollection
    const userReviewsCol = collection(db, 'users', uid, 'scheduled_reviews');
    const q = query(userReviewsCol, where('status', '==', 'pending'));
    const snap = await getDocs(q);

    snap.forEach((docSnap) => {
      const data = docSnap.data() as FirestoreReviewQuestion;
      const id = docSnap.id;
      seenIds.add(id);

      let daysRemaining = 0;
      let isDue = false;
      if (data.review_date) {
        const dueDt = new Date(data.review_date);
        const diffMs = dueDt.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.round((diffMs / 86400000) * 10) / 10);
        isDue = diffMs <= 0;
      }

      results.push({
        ...data,
        id,
        days_remaining: daysRemaining,
        is_due: isDue
      });
    });

    // 2. Fallback check on root review_questions for student_id
    if (results.length === 0) {
      try {
        const rootReviewsCol = collection(db, 'review_questions');
        const rootQ = query(rootReviewsCol, where('student_id', '==', uid), where('status', '==', 'pending'));
        const rootSnap = await getDocs(rootQ);
        rootSnap.forEach((docSnap) => {
          const data = docSnap.data() as FirestoreReviewQuestion;
          const id = docSnap.id;
          if (!seenIds.has(id)) {
            let daysRemaining = 0;
            let isDue = false;
            if (data.review_date) {
              const dueDt = new Date(data.review_date);
              const diffMs = dueDt.getTime() - now.getTime();
              daysRemaining = Math.max(0, Math.round((diffMs / 86400000) * 10) / 10);
              isDue = diffMs <= 0;
            }
            results.push({
              ...data,
              id,
              days_remaining: daysRemaining,
              is_due: isDue
            });
          }
        });
      } catch {}
    }

    return results;
  } catch (err) {
    console.warn('[Firestore] getScheduledQuestionsForStudent error:', err);
    return [];
  }
}

/**
 * Updates a question after review in Firestore (marks mastered or reschedules).
 */
export async function updateScheduledQuestionStatus(
  uid: string,
  questionId: string,
  isCorrect: boolean
): Promise<void> {
  if (!uid || !questionId) return;
  try {
    const userDocRef = doc(db, 'users', uid, 'scheduled_reviews', questionId);
    if (isCorrect) {
      await updateDoc(userDocRef, {
        status: 'mastered',
        reviewedAt: serverTimestamp()
      }).catch(() => {});
    } else {
      const newReviewDate = new Date(Date.now() + 3 * 86400000).toISOString();
      await updateDoc(userDocRef, {
        review_date: newReviewDate,
        status: 'pending',
        reviewedAt: serverTimestamp()
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[Firestore] updateScheduledQuestionStatus error:', err);
  }
}

/**
 * Seeds initial interactive review questions for a new student in Firestore so their bank is immediately active.
 */
export async function seedInitialStudentReviewQuestions(
  uid: string,
  isAr: boolean = true
): Promise<FirestoreReviewQuestion[]> {
  if (!uid) return [];
  const starters: Omit<FirestoreReviewQuestion, 'student_id'>[] = [
    {
      question: isAr
        ? 'ما هو المبدأ الأساسي وراء خوارزمية البحث الثنائي (Binary Search) وتعقيدها الزمني؟'
        : 'What is the core principle of Binary Search and its time complexity?',
      topic: isAr ? 'هياكل البيانات والخوارزميات' : 'Data Structures & Algorithms',
      page: 4,
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
      correct_answer: 'O(log n)',
      explanation: isAr
        ? 'يقوم البحث الثنائي بتقسيم نطاق البحث إلى النصف في كل خطوة، مما يعطيه تعقيداً زمنياً O(log n).'
        : 'Binary search halves the search space at each iteration, resulting in O(log n) complexity.',
      days_interval: 3
    },
    {
      question: isAr
        ? 'في التعلم العميق والشبكات العصبية (CNNs)، ما هي الوظيفة المحورية لطبقات التجميع (Pooling)؟'
        : 'In Deep Learning (CNNs), what is the primary role of pooling layers?',
      topic: isAr ? 'الذكاء الاصطناعي والتعلم العميق' : 'AI & Deep Learning',
      page: 7,
      options: [
        isAr ? 'تقليل الأبعاد الحسابية والاحتفاظ بالخصائص الجوهرية' : 'Reduce spatial dimensions while retaining critical features',
        isAr ? 'مضاعفة أوزان الشبكة العصبية' : 'Double total neural weights',
        isAr ? 'تشفير الصور وتحويلها لنصوص' : 'Encode images to text format',
        isAr ? 'زيادة حجم الصورة الأصلية' : 'Increase original image dimensions'
      ],
      correct_answer: isAr
        ? 'تقليل الأبعاد الحسابية والاحتفاظ بالخصائص الجوهرية'
        : 'Reduce spatial dimensions while retaining critical features',
      explanation: isAr
        ? 'تُستخدم طبقات Max-Pooling لتقليل الأبعاد الحسابية ومنع فرط التخصيص (Overfitting).'
        : 'Pooling layers downsample feature maps, reducing compute load and preventing overfitting.',
      days_interval: 3
    },
    {
      question: isAr
        ? 'ما هو المفهوم الجوهري لتحقيق اتساق البيانات في خوارزمية باكسوس (Paxos)؟'
        : 'What is the foundational concept for data consistency in the Paxos consensus algorithm?',
      topic: isAr ? 'الأنظمة الموزعة والتوافق' : 'Distributed Systems Consensus',
      page: 3,
      options: [
        isAr ? 'إجماع الأغلبية (Quorum Consensus)' : 'Majority Quorum Consensus',
        isAr ? 'التخزين المؤقت في الذاكرة' : 'In-memory caching',
        isAr ? 'المعالجة الأحادية المتسلسلة' : 'Single-thread sequential processing',
        isAr ? 'استخدام ساعة ذرية مركزية' : 'Centralized atomic clock synchronization'
      ],
      correct_answer: isAr ? 'إجماع الأغلبية (Quorum Consensus)' : 'Majority Quorum Consensus',
      explanation: isAr
        ? 'يعتمد باكسوس على تصويت واكتمال نصاب الأغلبية (Quorum) لضمان اتخاذ قرار متسق حتى عند فشل بعض العقد.'
        : 'Paxos requires majority quorum agreement to guarantee safety and consistency across distributed nodes.',
      days_interval: 3
    }
  ];

  const created: FirestoreReviewQuestion[] = [];
  for (const q of starters) {
    const docId = await saveScheduledQuestionForStudent(uid, q);
    if (docId) {
      created.push({
        ...q,
        id: docId,
        student_id: uid,
        status: 'pending',
        is_due: true,
        days_remaining: 0
      });
    }
  }

  return created;
}

/**
 * Saves a quick quiz result under the student's history in Firestore.
 */
export async function saveStudentQuizAttempt(
  uid: string,
  payload: {
    lectureId?: string;
    lectureTitle?: string;
    slideNumber?: number;
    question: string;
    topic?: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }
): Promise<void> {
  if (!uid) return;
  try {
    const userQuizzesCol = collection(db, 'users', uid, 'quizzes');
    await addDoc(userQuizzesCol, {
      ...payload,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[Firestore] saveStudentQuizAttempt error:', err);
  }
}