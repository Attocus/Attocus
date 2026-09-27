import React, { useState, useEffect } from 'react';
import { Lecture } from './types';
import { SAMPLE_LECTURES } from './data/sampleLectures';
import { IntroView } from './components/IntroView';
import { HomeView } from './components/HomeView';
import { StudyRoomView } from './components/StudyRoomView';
import { AboutView } from './components/AboutView';
import { InfoPagesView, InfoSection } from './components/InfoPagesView';
import { OnboardingTour } from './components/OnboardingTour';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import {
  saveLectureToFirestore,
  getLecturesFromFirestore,
  deleteLectureFromFirestore,
  batchSaveInitialLectures,
  syncUserStatsToFirestore,
  getUserStatsFromFirestore,
  getOnboardingStatus,
  completeOnboarding
} from './services/firestoreService';
import {
  saveLectureToDB,
  getAllLecturesFromDB,
  deleteLectureFromDB
} from './services/dbStorage';

function AppContent() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<'intro' | 'home' | 'study_room' | 'about' | 'info'>(() => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'about' || hash === 'developers' || hash === 'tech' || hash === 'contact') return 'about';
      if (['privacy', 'terms', 'security', 'cookies', 'features', 'pricing', 'updates'].includes(hash)) return 'info';
    } catch { }
    return 'intro';
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleCompleteOnboarding = async () => {
    if (!currentUser) throw new Error('Sign in to save your tour.');
    await completeOnboarding(currentUser.uid);
    setShowOnboarding(false);
  };

  // Check once the authenticated user enters Home or Study Room.
  // Firestore is the source of truth across devices.
  const workspaceReady = currentScreen === 'home' || currentScreen === 'study_room';
  useEffect(() => {

    if (!workspaceReady || authLoading || !currentUser) {
      setShowOnboarding(false);
      return;
    }


    let cancelled = false;


    getOnboardingStatus(currentUser.uid)
      .then(completed => {

        if (!cancelled) {
          setShowOnboarding(!completed);
        }
      })
      .catch(err => {
        console.error('[Onboarding] Firestore error:', err);
      });

    return () => { cancelled = true; };
  }, [workspaceReady, authLoading, currentUser?.uid]);

  const [aboutInitialSection, setAboutInitialSection] = useState<'about' | 'developers' | 'tech' | 'contact'>('about');
  const [infoInitialSection, setInfoInitialSection] = useState<InfoSection>(() => {
    try {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['privacy', 'terms', 'security', 'cookies', 'features', 'pricing', 'updates'].includes(hash)) {
        return hash as InfoSection;
      }
    } catch { }
    return 'privacy';
  });
  const [lectures, setLectures] = useState<Lecture[]>(SAMPLE_LECTURES);

  const [activeLectureId, setActiveLectureId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('study_coach_active_lecture_id');
      if (saved) return saved;
    } catch { }
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

        if (storedLectures && storedLectures.length > 0) {
          setLectures(storedLectures);
          if (savedActiveId && storedLectures.some(l => l.id === savedActiveId)) {
            setActiveLectureId(savedActiveId);
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
          setLectures(prev => {
            const map = new Map<string, Lecture>();
            // 1. Put cloud lectures into map
            cloudLectures.forEach(l => map.set(l.id, l));
            // 2. Merge local lectures, giving priority to local uploads and high-res canvas slides
            prev.forEach(l => {
              const fromCloud = map.get(l.id);
              if (fromCloud) {
                map.set(l.id, {
                  ...fromCloud,
                  ...l,
                  slides: l.slides && l.slides.length > 0 ? l.slides : fromCloud.slides
                });
              } else {
                map.set(l.id, l);
              }
            });
            const merged = Array.from(map.values());
            merged.forEach(l => saveLectureToDB(l));
            return merged;
          });
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
    } catch { }
  }, [totalFocusPoints]);

  const activeLecture = lectures.find(l => l.id === activeLectureId) || lectures[0];

  // Handle URL hash changes (#about, #developers, #contact, #tech, #intro, #home, #privacy, #terms, #security, #cookies, #features, #pricing, #updates)
  useEffect(() => {
    const handleHash = () => {
      const raw = window.location.hash.replace('#', '').toLowerCase();
      if (raw === 'about' || raw === 'developers' || raw === 'tech' || raw === 'contact') {
        setAboutInitialSection(raw as 'about' | 'developers' | 'tech' | 'contact');
        setCurrentScreen('about');
      } else if (['privacy', 'terms', 'security', 'cookies', 'features', 'pricing', 'updates'].includes(raw)) {
        setInfoInitialSection(raw as InfoSection);
        setCurrentScreen('info');
      } else if (raw === 'intro') {
        setCurrentScreen('intro');
      } else if (raw === 'home') {
        setCurrentScreen('home');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);



  const handleEnterWorkspace = () => {
    setCurrentScreen('home');
    try {
      sessionStorage.setItem('attocus_entered_workspace', 'true');
      localStorage.setItem('study_coach_active_screen', 'home');
      if (window.location.hash === '#intro') {
        history.replaceState(null, '', window.location.pathname);
      }
    } catch { }
  };

  const handleSelectLecture = (lectureId: string) => {
    setActiveLectureId(lectureId);
    setCurrentScreen('study_room');
    try {
      localStorage.setItem('study_coach_active_lecture_id', lectureId);
      localStorage.setItem('study_coach_active_screen', 'study_room');
    } catch { }
  };

  const handleOpenAbout = (section?: 'about' | 'developers' | 'tech' | 'contact') => {
    const target = section || 'about';
    setAboutInitialSection(target);
    setCurrentScreen('about');
    window.location.hash = target;
    try {
      localStorage.setItem('study_coach_active_screen', 'about');
    } catch { }
  };

  const handleOpenInfo = (section: InfoSection) => {
    setInfoInitialSection(section);
    setCurrentScreen('info');
    window.location.hash = section;
    try {
      localStorage.setItem('study_coach_active_screen', 'info');
    } catch { }
  };

  const handleReturnHome = () => {
    setCurrentScreen('home');
    if (window.location.hash) {
      try {
        history.replaceState(null, '', window.location.pathname);
      } catch { }
    }
    try {
      localStorage.setItem('study_coach_active_screen', 'home');
    } catch { }
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
    } catch { }

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
    } catch { }

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
          } catch { }
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

  const { dir } = useLanguage();

  return (
    <div dir={dir} className="w-full h-full min-h-screen bg-[#FAFAF8] dark:bg-[#121417] font-sans antialiased text-[#1E2124] dark:text-[#F3F4F6] transition-colors duration-200">
      {currentScreen === 'intro' ? (
        <IntroView
          onEnterApp={handleEnterWorkspace}
          onOpenAbout={handleOpenAbout}
          onSelectLecture={handleSelectLecture}
          recentLecture={activeLecture}
        />
      ) : currentScreen === 'about' ? (
        <AboutView
          onReturnHome={handleReturnHome}
          initialSection={aboutInitialSection}
        />
      ) : currentScreen === 'info' ? (
        <InfoPagesView
          onReturnHome={handleReturnHome}
          initialSection={infoInitialSection}
        />
      ) : currentScreen === 'study_room' ? (
        <StudyRoomView
          lecture={activeLecture}
          onReturnHome={handleReturnHome}
          onUpdateLecture={handleUpdateLecture}
          onUploadLecture={handleUploadLecture}
          onAddFocusPoints={handleAddFocusPoints}
        />
      ) : (
        <HomeView
          lectures={lectures}
          activeLectureId={activeLectureId}
          onSelectLecture={handleSelectLecture}
          onUploadLecture={handleUploadLecture}
          onDeleteLecture={handleDeleteLecture}
          totalFocusPoints={totalFocusPoints}
          todayMinutesStudied={todayMinutesStudied}
          onOpenAbout={handleOpenAbout}
          onOpenInfo={handleOpenInfo}
        />
      )}
      {showOnboarding && currentUser &&
        (currentScreen === 'home' || currentScreen === 'study_room') && (
          <OnboardingTour
            screen={currentScreen}
            onNavigateHome={handleReturnHome}
            onNavigateStudyRoom={() => {
              if (activeLecture) handleSelectLecture(activeLecture.id);
            }}
            onComplete={handleCompleteOnboarding}
          />
        )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
