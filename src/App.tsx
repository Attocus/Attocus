import React, { useState, useEffect } from 'react';
import { Lecture } from './types';
import { SAMPLE_LECTURES } from './data/sampleLectures';
import { HomeView } from './components/HomeView';
import { StudyRoomView } from './components/StudyRoomView';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'study_room'>('home');
  const [lectures, setLectures] = useState<Lecture[]>(() => {
    try {
      const saved = localStorage.getItem('study_coach_lectures');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return SAMPLE_LECTURES;
  });

  const [activeLectureId, setActiveLectureId] = useState<string>(() => {
    return lectures[0]?.id || SAMPLE_LECTURES[0].id;
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

  // Save lectures
  useEffect(() => {
    try {
      localStorage.setItem('study_coach_lectures', JSON.stringify(lectures));
    } catch {}
  }, [lectures]);

  // Save focus points
  useEffect(() => {
    try {
      localStorage.setItem('study_coach_focus_points', totalFocusPoints.toString());
    } catch {}
  }, [totalFocusPoints]);

  const activeLecture = lectures.find(l => l.id === activeLectureId) || lectures[0];

  const handleSelectLecture = (lectureId: string) => {
    setActiveLectureId(lectureId);
    setCurrentScreen('study_room');
  };

  const handleUploadLecture = (newLecture: Lecture) => {
    setLectures(prev => [newLecture, ...prev]);
    setActiveLectureId(newLecture.id);
    setCurrentScreen('study_room');
  };

  const handleUpdateLecture = (updated: Lecture) => {
    setLectures(prev => prev.map(l => (l.id === updated.id ? updated : l)));
  };

  const handleDeleteLecture = (lectureIdToDelete: string) => {
    try {
      localStorage.removeItem(`annotations-${lectureIdToDelete}`);
      localStorage.removeItem(`pomodoro-${lectureIdToDelete}`);
    } catch {}

    setLectures(prev => {
      const remaining = prev.filter(l => l.id !== lectureIdToDelete);
      if (activeLectureId === lectureIdToDelete) {
        if (remaining.length > 0) {
          setActiveLectureId(remaining[0].id);
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
    <div className="w-full h-full min-h-screen bg-[#FAFAF8] font-sans antialiased text-[#1E2124]">
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
          onReturnHome={() => setCurrentScreen('home')}
          onUpdateLecture={handleUpdateLecture}
          onUploadLecture={handleUploadLecture}
          onAddFocusPoints={handleAddFocusPoints}
        />
      )}
    </div>
  );
}
