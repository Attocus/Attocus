import React, { useState, useEffect } from 'react';
import { Lecture } from './types';
import { SAMPLE_LECTURES } from './data/sampleLectures';
import { HomeView } from './components/HomeView';
import { StudyRoomView } from './components/StudyRoomView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import {
  saveLectureToFirestore,
  getLecturesFromFirestore,
  deleteLectureFromFirestore,
  batchSaveInitialLectures,
  syncUserStatsToFirestore,
  getUserStatsFromFirestore
} from './services/firestoreService';
import {
  saveLectureToDB,
  getAllLecturesFromDB,
  deleteLectureFromDB
} from './services/dbStorage';

function AppContent() {
  const { currentUser, userProfile } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<'home' | 'study_room'>('home');
  const [lectures, setLectures] = useState<Lecture[]>(SAMPLE_LECTURES);

  const [activeLectureId, setActiveLectureId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('study_coach_active_lecture_id');
      if (saved) return saved;
    } catch {}
    return SAMPLE_LECTURES[0].id;
  });

  const [totalFocusPoints, setTotalFocusPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('study_coach_focus_points');
      return saved ? parseInt(saved, 10) : 185;
    } catch {
      return 185;
    }
  });

  const [todayMinutesStudied, setTodayMinutesStudied] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('study_coach_today_minutes');
      return saved ? parseInt(saved, 10) : 24;
    } catch {
      return 24;
    }
  });

  // 1. Initial Load from IndexedDB (persists all uploaded lectures and canvases across refreshes)
  useEffect(() => {
    const initStorage = async () => {
      try {
        const storedLectures = await getAllLecturesFromDB();
        const savedActiveId = localStorage.getItem('study_coach_active_lecture_id');
        const savedScreen = localStorage.getItem('study_coach_active_screen');

        if (storedLectures && storedLectures.length > 0) {
          setLectures(storedLectures);
          if (savedActiveId && storedLectures.some(l => l.id === savedActiveId)) {
            setActiveLectureId(savedActiveId);
            if (savedScreen === 'study_room') {
              setCurrentScreen('study_room');
            }
          } else {
            setActiveLectureId(storedLectures[0].id);
          }
        } else {
          // Seed IndexedDB with sample lectures on first run
          for (const sm of SAMPLE_LECTURES) {
            await saveLectureToDB(sm);
          }
        }
      } catch (err) {
        console.warn('[Storage] Error loading from IndexedDB:', err);
      }
    };
    initStorage();
  }, []);

  // 2. Load cloud lectures & stats from Firestore when user logs in
  useEffect(() => {
    if (!currentUser) return;

    const loadCloudData = async () => {
      try {
        const cloudLectures = await getLecturesFromFirestore(currentUser.uid);
        if (cloudLectures && cloudLectures.length > 0) {
          setLectures(cloudLectures);
          setActiveLectureId(cloudLectures[0].id);
        } else {
          // Sync current initial lectures to Firestore so the user doesn't start empty
          await batchSaveInitialLectures(currentUser.uid, lectures);
        }

        // Fetch user stats
        const stats = await getUserStatsFromFirestore(currentUser.uid);
        if (stats) {
          if (stats.focusPoints !== undefined) setTotalFocusPoints(stats.focusPoints);
          if (stats.todayMinutesStudied !== undefined) setTodayMinutesStudied(stats.todayMinutesStudied);
        }
      } catch (err) {
        console.warn('[Firestore] Error syncing cloud data on login:', err);
      }
    };

    loadCloudData();
  }, [currentUser]);

  // Sync focus points & minutes to Firestore when updated
  useEffect(() => {
    if (currentUser) {
      syncUserStatsToFirestore(currentUser.uid, {
        focusPoints: totalFocusPoints,
        todayMinutesStudied
      });
    }
  }, [totalFocusPoints, todayMinutesStudied, currentUser]);

  // Save focus points locally
  useEffect(() => {
    try {
      localStorage.setItem('study_coach_focus_points', totalFocusPoints.toString());
    } catch {}
  }, [totalFocusPoints]);

  const activeLecture = lectures.find(l => l.id === activeLectureId) || lectures[0];

  const handleSelectLecture = (lectureId: string) => {
    setActiveLectureId(lectureId);
    setCurrentScreen('study_room');
    try {
      localStorage.setItem('study_coach_active_lecture_id', lectureId);
      localStorage.setItem('study_coach_active_screen', 'study_room');
    } catch {}
  };

  const handleReturnHome = () => {
    setCurrentScreen('home');
    try {
      localStorage.setItem('study_coach_active_screen', 'home');
    } catch {}
  };

  const handleUploadLecture = (newLecture: Lecture) => {
    // Save to IndexedDB (supports large PDF page canvases and full resolution images)
    saveLectureToDB(newLecture);

    setLectures(prev => [newLecture, ...prev.filter(l => l.id !== newLecture.id)]);
    setActiveLectureId(newLecture.id);
    setCurrentScreen('study_room');

    try {
      localStorage.setItem('study_coach_active_lecture_id', newLecture.id);
      localStorage.setItem('study_coach_active_screen', 'study_room');
    } catch {}

    // Register uploaded file in Firestore
    saveLectureToFirestore(currentUser?.uid || 'user_1', newLecture);
  };

  const handleUpdateLecture = (updated: Lecture) => {
    saveLectureToDB(updated);
    setLectures(prev => prev.map(l => (l.id === updated.id ? updated : l)));

    if (currentUser) {
      saveLectureToFirestore(currentUser.uid, updated);
    }
  };

  const handleDeleteLecture = (lectureIdToDelete: string) => {
    deleteLectureFromDB(lectureIdToDelete);

    try {
      localStorage.removeItem(`annotations-${lectureIdToDelete}`);
      localStorage.removeItem(`pomodoro-${lectureIdToDelete}`);
    } catch {}

    if (currentUser) {
      deleteLectureFromFirestore(currentUser.uid, lectureIdToDelete);
    }

    setLectures(prev => {
      const remaining = prev.filter(l => l.id !== lectureIdToDelete);
      if (activeLectureId === lectureIdToDelete) {
        if (remaining.length > 0) {
          setActiveLectureId(remaining[0].id);
          try {
            localStorage.setItem('study_coach_active_lecture_id', remaining[0].id);
          } catch {}
        } else {
          setActiveLectureId('');
        }
      }
      return remaining;
    });
  };

  const handleAddFocusPoints = (points: number) => {
    setTotalFocusPoints(prev => prev + points);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#FAFAF8] dark:bg-[#121417] font-sans antialiased text-[#1E2124] dark:text-[#F3F4F6] transition-colors duration-200">
      {currentScreen === 'home' ? (
        <HomeView
          lectures={lectures}
          activeLectureId={activeLectureId}
          onSelectLecture={handleSelectLecture}
          onUploadLecture={handleUploadLecture}
          onDeleteLecture={handleDeleteLecture}
          totalFocusPoints={totalFocusPoints}
          todayMinutesStudied={todayMinutesStudied}
        />
      ) : (
        <StudyRoomView
          lecture={activeLecture}
          onReturnHome={handleReturnHome}
          onUpdateLecture={handleUpdateLecture}
          onUploadLecture={handleUploadLecture}
          onAddFocusPoints={handleAddFocusPoints}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
