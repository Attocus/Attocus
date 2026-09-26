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
  addDoc
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
    }).catch(() => {});

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
    ).catch(() => {});
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
    await deleteDoc(annotRef).catch(() => {});
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
  } catch {}

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
