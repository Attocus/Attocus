import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PomodoroMode, PomodoroState } from '../types';
import { Play, Pause, RotateCcw, Coffee, Sparkles, Bell } from 'lucide-react';

interface PomodoroTimerProps {
  lectureId: string;
  onPomodoroComplete?: () => void;
}

const DURATIONS: Record<PomodoroMode, number> = {
  focus: 25 * 60, // 25 mins
  short_break: 5 * 60, // 5 mins
  long_break: 15 * 60 // 15 mins
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  lectureId,
  onPomodoroComplete
}) => {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedCycles, setCompletedCycles] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`pomodoro_cycles_${lectureId}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const endTimeRef = useRef<number | null>(null);

  // Play gentle completion chime
  const playGentleChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // Audio not permitted or supported
    }
  }, []);

  // When starting or resuming, set precise target timestamp
  useEffect(() => {
    if (isRunning) {
      endTimeRef.current = Date.now() + secondsRemaining * 1000;
    } else {
      endTimeRef.current = null;
    }
  }, [isRunning]);

  // Accurate timer tick using Date.now()
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (!endTimeRef.current) return;
      const msLeft = endTimeRef.current - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(msLeft / 1000));

      setSecondsRemaining(nextSeconds);

      if (nextSeconds <= 0) {
        clearInterval(interval);
        playGentleChime();
        setIsRunning(false);
        endTimeRef.current = null;

        if (mode === 'focus') {
          const nextCompleted = completedCycles + 1;
          setCompletedCycles(nextCompleted);
          try {
            localStorage.setItem(`pomodoro_cycles_${lectureId}`, nextCompleted.toString());
          } catch {}
          if (onPomodoroComplete) onPomodoroComplete();

          const nextMode: PomodoroMode = nextCompleted % 4 === 0 ? 'long_break' : 'short_break';
          setMode(nextMode);
          setSecondsRemaining(DURATIONS[nextMode]);
        } else {
          setMode('focus');
          setSecondsRemaining(DURATIONS.focus);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, mode, completedCycles, lectureId, onPomodoroComplete, playGentleChime]);

  const toggleRun = () => {
    setIsRunning(prev => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    endTimeRef.current = null;
    setSecondsRemaining(DURATIONS[mode]);
  };

  const switchMode = (newMode: PomodoroMode) => {
    setIsRunning(false);
    endTimeRef.current = null;
    setMode(newMode);
    setSecondsRemaining(DURATIONS[newMode]);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      id="pomodoro-timer-bar"
      className="flex items-center gap-2 bg-[#F5F7F3] dark:bg-[#22262C] px-2.5 py-1 rounded-xl border border-[#DCE0D6] dark:border-[#2E3339] select-none text-xs font-mono"
    >
      {/* Mode Indicator Button */}
      <button
        type="button"
        id="pomodoro-mode-switch-btn"
        onClick={() => switchMode(mode === 'focus' ? 'short_break' : 'focus')}
        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ${
          mode === 'focus'
            ? 'bg-[#2E7D32] dark:bg-[#1B5E20] text-white'
            : 'bg-[#B45309] text-white'
        }`}
        title="Click to toggle between Focus & Break"
      >
        {mode === 'focus' ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Pomodoro</span>
          </>
        ) : (
          <>
            <Coffee className="w-3 h-3" />
            <span>Break</span>
          </>
        )}
      </button>

      {/* Countdown Timer */}
      <span className="font-bold text-[#1C2023] dark:text-[#F1F3F5] tracking-wider px-1 text-xs sm:text-sm">
        {formattedTime}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-0.5 border-l border-[#D6DAD0] dark:border-[#2E3339] pl-1.5">
        <button
          type="button"
          id="pomodoro-play-pause-btn"
          onClick={toggleRun}
          className="w-6 h-6 rounded-md hover:bg-white dark:hover:bg-[#1A1D22] flex items-center justify-center text-[#2E7D32] dark:text-[#4ADE80] transition-colors"
          title={isRunning ? 'Pause Pomodoro' : 'Start Pomodoro'}
        >
          {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
        </button>

        <button
          type="button"
          id="pomodoro-reset-btn"
          onClick={resetTimer}
          className="w-6 h-6 rounded-md hover:bg-white dark:hover:bg-[#1A1D22] flex items-center justify-center text-[#6B7279] dark:text-[#9AA0A6] transition-colors"
          title="Reset timer"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Cycle Count */}
      {completedCycles > 0 && (
        <span
          className="hidden sm:inline-flex text-[10px] text-[#555C62] dark:text-[#CBD5E1] bg-[#EAECE6] dark:bg-[#1A1D22] px-1.5 py-0.5 rounded-md font-sans font-medium ml-0.5"
          title={`${completedCycles} Pomodoros completed for this file`}
        >
          🍅 {completedCycles}
        </span>
      )}
    </div>
  );
};

