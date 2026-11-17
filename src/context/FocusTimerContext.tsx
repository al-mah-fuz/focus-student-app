import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getMeta, setMeta } from '../db/indexedDb';
import type { FocusTimerMode } from '../types/academic';
import { useAcademic } from './AcademicContext';

export const FOCUS_PRESETS: Record<
  FocusTimerMode,
  { label: string; shortLabel: string; minutes: number; description: string }
> = {
  'focus-25': {
    label: '25m Focus',
    shortLabel: '25m',
    minutes: 25,
    description: 'Classic Pomodoro sprint for steady deep work',
  },
  'focus-50': {
    label: '50m Deep Study',
    shortLabel: '50m',
    minutes: 50,
    description: 'Extended session for problem sets & revision',
  },
  'short-break': {
    label: 'Short Break',
    shortLabel: '5m Break',
    minutes: 5,
    description: 'Step away, hydrate, and rest your eyes',
  },
  'long-break': {
    label: 'Long Break',
    shortLabel: '15m Break',
    minutes: 15,
    description: 'Full mental reset between study blocks',
  },
};

interface PersistedFocusTimerState {
  mode: FocusTimerMode;
  remainingSeconds: number;
  isRunning: boolean;
  endTimestamp: number | null;
  sessionLabel: string;
}

function playCompletionChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.14 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.14);
      osc.stop(ctx.currentTime + i * 0.14 + 0.46);
    });
  } catch {
    // Ignore audio context restrictions if blocked
  }
}

interface FocusTimerContextValue {
  mode: FocusTimerMode;
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  sessionLabel: string;
  isFocusOpen: boolean;
  justCompletedNotice: string | null;
  setSessionLabel: (label: string) => void;
  openFocusMode: () => void;
  closeFocusMode: () => void;
  selectMode: (mode: FocusTimerMode) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  dismissCompletedNotice: () => void;
}

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

export const FocusTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logFocusSession } = useAcademic();
  const [mode, setMode] = useState<FocusTimerMode>('focus-25');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    FOCUS_PRESETS['focus-25'].minutes * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [sessionLabel, setSessionLabelState] = useState('');
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [justCompletedNotice, setJustCompletedNotice] = useState<string | null>(null);

  const endTimestampRef = useRef<number | null>(null);
  const sessionLabelRef = useRef(sessionLabel);
  sessionLabelRef.current = sessionLabel;
  const hydratedRef = useRef(false);
  const completingRef = useRef(false);

  const totalSeconds = FOCUS_PRESETS[mode].minutes * 60;

  const persistTimer = useCallback((next: PersistedFocusTimerState) => {
    void setMeta<PersistedFocusTimerState>('focusTimerState', next);
  }, []);

  const handleComplete = useCallback(
    async (completedMode: FocusTimerMode) => {
      if (completingRef.current) return;
      completingRef.current = true;
      try {
        setIsRunning(false);
        endTimestampRef.current = null;
        setRemainingSeconds(0);
        playCompletionChime();
        const mins = FOCUS_PRESETS[completedMode].minutes;
        await logFocusSession(completedMode, mins, sessionLabelRef.current);
        setJustCompletedNotice(
          `${FOCUS_PRESETS[completedMode].label} completed and saved (${mins} min).`
        );
        persistTimer({
          mode: completedMode,
          remainingSeconds: 0,
          isRunning: false,
          endTimestamp: null,
          sessionLabel: sessionLabelRef.current,
        });
      } finally {
        completingRef.current = false;
      }
    },
    [logFocusSession, persistTimer]
  );

  // Restore active timer state from IndexedDB on app launch / refresh
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    void (async () => {
      try {
        const saved = await getMeta<PersistedFocusTimerState>('focusTimerState');
        if (!saved || !FOCUS_PRESETS[saved.mode]) return;

        setMode(saved.mode);
        setSessionLabelState(saved.sessionLabel || '');
        sessionLabelRef.current = saved.sessionLabel || '';

        if (saved.isRunning && saved.endTimestamp) {
          const diffMs = saved.endTimestamp - Date.now();
          if (diffMs <= 0) {
            await handleComplete(saved.mode);
          } else {
            endTimestampRef.current = saved.endTimestamp;
            setRemainingSeconds(Math.ceil(diffMs / 1000));
            setIsRunning(true);
          }
        } else {
          endTimestampRef.current = null;
          setRemainingSeconds(
            typeof saved.remainingSeconds === 'number'
              ? saved.remainingSeconds
              : FOCUS_PRESETS[saved.mode].minutes * 60
          );
          setIsRunning(false);
        }
      } catch {
        // Non-fatal if appMeta unavailable
      }
    })();
  }, [handleComplete]);

  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      if (!endTimestampRef.current) return;
      const diffMs = endTimestampRef.current - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(nextSeconds);
      if (nextSeconds <= 0) {
        void handleComplete(mode);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [isRunning, mode, handleComplete]);

  const setSessionLabel = useCallback(
    (label: string) => {
      setSessionLabelState(label);
      sessionLabelRef.current = label;
      persistTimer({
        mode,
        remainingSeconds,
        isRunning,
        endTimestamp: endTimestampRef.current,
        sessionLabel: label,
      });
    },
    [mode, remainingSeconds, isRunning, persistTimer]
  );

  const start = useCallback(() => {
    setJustCompletedNotice(null);
    const secs = remainingSeconds > 0 ? remainingSeconds : FOCUS_PRESETS[mode].minutes * 60;
    if (remainingSeconds === 0) {
      setRemainingSeconds(secs);
    }
    const endTs = Date.now() + secs * 1000;
    endTimestampRef.current = endTs;
    setIsRunning(true);
    persistTimer({
      mode,
      remainingSeconds: secs,
      isRunning: true,
      endTimestamp: endTs,
      sessionLabel: sessionLabelRef.current,
    });
  }, [mode, remainingSeconds, persistTimer]);

  const pause = useCallback(() => {
    const left = endTimestampRef.current
      ? Math.max(0, Math.ceil((endTimestampRef.current - Date.now()) / 1000))
      : remainingSeconds;
    setRemainingSeconds(left);
    endTimestampRef.current = null;
    setIsRunning(false);
    persistTimer({
      mode,
      remainingSeconds: left,
      isRunning: false,
      endTimestamp: null,
      sessionLabel: sessionLabelRef.current,
    });
  }, [mode, remainingSeconds, persistTimer]);

  const reset = useCallback(() => {
    const full = FOCUS_PRESETS[mode].minutes * 60;
    endTimestampRef.current = null;
    setIsRunning(false);
    setJustCompletedNotice(null);
    setRemainingSeconds(full);
    persistTimer({
      mode,
      remainingSeconds: full,
      isRunning: false,
      endTimestamp: null,
      sessionLabel: sessionLabelRef.current,
    });
  }, [mode, persistTimer]);

  const selectMode = useCallback(
    (nextMode: FocusTimerMode) => {
      const full = FOCUS_PRESETS[nextMode].minutes * 60;
      endTimestampRef.current = null;
      setIsRunning(false);
      setJustCompletedNotice(null);
      setMode(nextMode);
      setRemainingSeconds(full);
      persistTimer({
        mode: nextMode,
        remainingSeconds: full,
        isRunning: false,
        endTimestamp: null,
        sessionLabel: sessionLabelRef.current,
      });
    },
    [persistTimer]
  );

  const value = useMemo<FocusTimerContextValue>(
    () => ({
      mode,
      remainingSeconds,
      totalSeconds,
      isRunning,
      sessionLabel,
      isFocusOpen,
      justCompletedNotice,
      setSessionLabel,
      openFocusMode: () => setIsFocusOpen(true),
      closeFocusMode: () => setIsFocusOpen(false),
      selectMode,
      start,
      pause,
      reset,
      dismissCompletedNotice: () => setJustCompletedNotice(null),
    }),
    [
      mode,
      remainingSeconds,
      totalSeconds,
      isRunning,
      sessionLabel,
      isFocusOpen,
      justCompletedNotice,
      setSessionLabel,
      selectMode,
      start,
      pause,
      reset,
    ]
  );

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
};

export function useFocusTimer(): FocusTimerContextValue {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) {
    throw new Error('useFocusTimer must be used inside FocusTimerProvider');
  }
  return ctx;
}
