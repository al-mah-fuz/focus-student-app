import React from 'react';
import { CheckCircle2, Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAcademic } from '../context/AcademicContext';
import { FOCUS_PRESETS, useFocusTimer } from '../context/FocusTimerContext';
import type { FocusTimerMode } from '../types/academic';
import { toLocalDateKey } from '../utils/dateUtils';

const MODE_ORDER: FocusTimerMode[] = ['focus-25', 'focus-50', 'short-break', 'long-break'];

export const FocusModeModal: React.FC = () => {
  const { focusSessions } = useAcademic();
  const {
    mode,
    remainingSeconds,
    totalSeconds,
    isRunning,
    sessionLabel,
    isFocusOpen,
    justCompletedNotice,
    setSessionLabel,
    closeFocusMode,
    selectMode,
    start,
    pause,
    reset,
    dismissCompletedNotice,
  } = useFocusTimer();

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedClock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progress =
    totalSeconds > 0
      ? Math.max(0, Math.min(1, (totalSeconds - remainingSeconds) / totalSeconds))
      : 0;
  const radius = 114;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const todayKey = toLocalDateKey();
  const todaysSessions = focusSessions.filter((s) => s.dateKey === todayKey);
  const todaysFocusMinutes = todaysSessions
    .filter((s) => s.mode === 'focus-25' || s.mode === 'focus-50')
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  return (
    <AnimatePresence>
      {isFocusOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 h-dvh bg-[#0C1029] text-white flex flex-col overflow-y-auto overscroll-contain pt-safe pb-safe pl-safe pr-safe"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 28%, rgba(107, 92, 209, 0.22), transparent 58%)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Focus Mode Study Timer"
        >
          {/* Top Bar */}
          <header className="flex items-center justify-between gap-2 px-4 sm:px-8 py-3.5 sm:py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Timer className="w-4 h-4 text-[#F5B700]" />
              </span>
              <span className="font-display font-bold text-base tracking-tight truncate">
                FOCUS⭐️ Study Timer
              </span>
            </div>
            <button
              type="button"
              onClick={closeFocusMode}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-white/10 hover:bg-white/18 text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <X className="w-4 h-4" />
              <span>Exit Focus</span>
            </button>
          </header>

          {/* Main Centered Distraction-Free Workspace */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-5 py-6 sm:py-8 max-w-2xl mx-auto w-full">
            {/* Preset Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-white/8 border border-white/10 rounded-2xl w-full max-w-xl mb-6 sm:mb-7">
              {MODE_ORDER.map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMode(m)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#EAE6FA] text-[#141B41] shadow-xs'
                        : 'text-[#D8D1F5] hover:text-white hover:bg-white/6'
                    }`}
                  >
                    {FOCUS_PRESETS[m].label}
                  </button>
                );
              })}
            </div>

            {/* Study Topic Input */}
            <input
              type="text"
              value={sessionLabel}
              onChange={(e) => setSessionLabel(e.target.value)}
              placeholder="What are you focusing on? (e.g. CSC 301 Chapter 4)"
              className="w-full max-w-md min-h-[44px] text-center rounded-xl bg-white/8 border border-white/15 px-4 text-base sm:text-sm text-white placeholder:text-[#A9A3CF] focus:outline-none focus:ring-2 focus:ring-[#F5B700]/65 mb-6 sm:mb-8"
            />

            {/* Circular Timer Ring */}
            <div className="relative w-60 h-60 sm:w-76 sm:h-76 flex items-center justify-center mb-6 sm:mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  fill="none"
                  stroke="rgba(216, 209, 245, 0.14)"
                  strokeWidth="10"
                />
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  fill="none"
                  stroke={mode.includes('break') ? '#A89CF0' : '#F5B700'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-[stroke-dashoffset] duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 sm:px-8">
                <span className="text-xs font-semibold text-[#D8D1F5] mb-1">
                  {FOCUS_PRESETS[mode].label}
                </span>
                <span className="font-mono text-4xl sm:text-6xl font-semibold tracking-tight tabular-nums text-white">
                  {formattedClock}
                </span>
                <span className="text-xs text-[#B9B3DA] mt-2 max-w-[180px] leading-relaxed">
                  {FOCUS_PRESETS[mode].description}
                </span>
              </div>
            </div>

            {/* Completion Notice */}
            {justCompletedNotice && (
              <div className="mb-6 flex items-center justify-between gap-3 w-full max-w-md rounded-xl bg-[#1E2756] border border-[#F5B700]/40 px-4 py-3 text-sm text-[#FEF3C7]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#F5B700] shrink-0" />
                  <span>{justCompletedNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={dismissCompletedNotice}
                  className="min-h-[44px] sm:min-h-0 px-2 text-xs underline text-[#D8D1F5] hover:text-white cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8 sm:mb-10 w-full">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={start}
                  className="inline-flex items-center justify-center gap-2.5 min-h-[50px] px-7 sm:px-8 rounded-2xl bg-[#F5B700] text-[#141B41] text-base font-bold hover:bg-[#FFC71F] active:scale-[0.98] transition-all cursor-pointer shadow-lg"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {remainingSeconds < totalSeconds && remainingSeconds > 0
                      ? 'Resume'
                      : 'Start Session'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pause}
                  className="inline-flex items-center justify-center gap-2.5 min-h-[50px] px-7 sm:px-8 rounded-2xl bg-[#EAE6FA] text-[#141B41] text-base font-bold hover:bg-white active:scale-[0.98] transition-all cursor-pointer shadow-lg"
                >
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 min-h-[50px] px-5 rounded-2xl bg-white/10 text-white text-sm font-semibold hover:bg-white/18 active:scale-[0.98] transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>

            {/* Session Tracking Summary */}
            <div className="w-full max-w-xl rounded-2xl bg-white/6 border border-white/12 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="font-display text-sm font-bold text-white">Completed Sessions</h3>
                  <p className="text-xs text-[#B9B3DA] mt-0.5">
                    Saved automatically to IndexedDB upon completion
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto tabular-nums">
                  <div className="sm:text-right">
                    <div className="text-xl font-bold text-[#F5B700]">{todaysSessions.length}</div>
                    <div className="text-[11px] text-[#D8D1F5]">Today</div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xl font-bold text-white">{todaysFocusMinutes}m</div>
                    <div className="text-[11px] text-[#D8D1F5]">Focus mins</div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xl font-bold text-[#D8D1F5]">{focusSessions.length}</div>
                    <div className="text-[11px] text-[#D8D1F5]">All-time</div>
                  </div>
                </div>
              </div>

              {focusSessions.length === 0 ? (
                <p className="pt-4 text-xs text-[#B9B3DA]">
                  No completed study sessions logged yet. Start a 25m or 50m session above to build momentum.
                </p>
              ) : (
                <ul className="divide-y divide-white/8 mt-2 max-h-44 overflow-y-auto">
                  {focusSessions.slice(0, 6).map((s) => (
                    <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-medium text-white truncate block">
                          {s.label || FOCUS_PRESETS[s.mode].label}
                        </span>
                        <span className="text-[#B9B3DA]">
                          {FOCUS_PRESETS[s.mode].label} ·{' '}
                          {new Date(s.completedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-[#F5B700] shrink-0">
                        +{s.durationMinutes}m
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
