import React, { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  GraduationCap,
  MapPin,
  Plus,
  Sparkles,
  Timer,
  Trash2,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { useFocusTimer } from '../context/FocusTimerContext';
import { useNow } from '../hooks/useNow';
import {
  selectDailyTaskProgress,
  selectNextUpcomingClass,
} from '../selectors/widgetSelectors';
import type {
  ActiveSection,
  AssessmentItem,
  ClassItem,
  TaskItem,
} from '../types/academic';
import {
  formatFullDate,
  formatRelativeDateLabel,
  formatShortDate,
  formatTime12h,
  formatTimeRange,
  getCountdownParts,
  getGreeting,
  isClassOnDate,
  parseDateAndTime,
  sortClassesChronologically,
  timeToMinutes,
  toLocalDateKey,
} from '../utils/dateUtils';

interface HomeViewProps {
  onNavigate: (section: ActiveSection) => void;
  onOpenNewClass: () => void;
  onOpenNewTask: () => void;
  onEditTask: (task: TaskItem) => void;
  onEditClass: (cls: ClassItem) => void;
  onEditAssessment: (item: AssessmentItem) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenNewClass,
  onOpenNewTask,
  onEditTask,
  onEditClass,
  onEditAssessment,
}) => {
  const {
    classes,
    tasks,
    assessments,
    focusSessions,
    hasSampleData,
    showFirstRunOffer,
    toggleTaskComplete,
    toggleAssessmentComplete,
    loadSampleData,
    removeSampleOnly,
    dismissFirstRunOffer,
  } = useAcademic();
  const { openFocusMode, isRunning, remainingSeconds } = useFocusTimer();
  const now = useNow(1000);

  const todayKey = toLocalDateKey(now);
  const greeting = getGreeting(now);
  const fullDate = formatFullDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const nextClass = useMemo(() => selectNextUpcomingClass(classes, now), [classes, now]);
  const dailyProgress = useMemo(() => selectDailyTaskProgress(tasks, now), [tasks, now]);

  const todaysClasses = useMemo(() => {
    return sortClassesChronologically(classes.filter((c) => isClassOnDate(c, todayKey)));
  }, [classes, todayKey]);

  const todaysTasks = useMemo(() => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    return tasks
      .filter((t) => t.dueDate === todayKey)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return priorityRank[a.priority] - priorityRank[b.priority];
      });
  }, [tasks, todayKey]);

  const upcomingAssignments = useMemo(() => {
    return assessments
      .filter((a) => a.type === 'assignment' && !a.completed)
      .sort(
        (a, b) =>
          parseDateAndTime(a.date, a.time).getTime() -
          parseDateAndTime(b.date, b.time).getTime()
      )
      .slice(0, 4);
  }, [assessments]);

  const upcomingExamsAndTests = useMemo(() => {
    return assessments
      .filter((a) => a.type !== 'assignment' && !a.completed)
      .filter((a) => parseDateAndTime(a.date, a.time).getTime() >= now.getTime() - 1000 * 60 * 60)
      .sort(
        (a, b) =>
          parseDateAndTime(a.date, a.time).getTime() -
          parseDateAndTime(b.date, b.time).getTime()
      )
      .slice(0, 4);
  }, [assessments, now]);

  const todaysFocusMinutes = useMemo(() => {
    return focusSessions
      .filter(
        (s) =>
          s.dateKey === todayKey &&
          (s.mode === 'focus-25' || s.mode === 'focus-50')
      )
      .reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [focusSessions, todayKey]);

  const progressRadius = 35;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset =
    progressCircumference * (1 - dailyProgress.percentage / 100);

  return (
    <div className="space-y-7">
      {/* Optional First-Run Demonstration Offer */}
      {showFirstRunOffer && (
        <section className="rounded-2xl bg-[#EAE6FA] border border-[#D4CCF3] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#141B41]">
              <Sparkles className="w-4 h-4 text-[#6B5CD1] shrink-0" />
              <span>Welcome to FOCUS⭐️ — your offline student workspace</span>
            </div>
            <p className="text-xs text-[#343A5E] max-w-2xl leading-relaxed">
              Start with an empty semester or load an optional sample schedule (classes, tasks, notes, and exams) that you can remove in one click anytime.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loadSampleData()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#141B41] text-white text-xs font-semibold hover:bg-[#1E2756] transition-colors cursor-pointer whitespace-nowrap"
            >
              Load Demo Semester
            </button>
            <button
              type="button"
              onClick={() => void dismissFirstRunOffer()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white text-[#141B41] border border-[#D4CCF3] text-xs font-semibold hover:bg-[#F7F6FA] transition-colors cursor-pointer whitespace-nowrap"
            >
              Start Empty
            </button>
          </div>
        </section>
      )}

      {/* Optional Demo Active Notice */}
      {hasSampleData && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-[#E6E3F1] px-4 py-2 text-xs text-[#4C5175]">
          <span>
            Optional demonstration semester items are loaded alongside your own records.
          </span>
          <button
            type="button"
            onClick={() => void removeSampleOnly()}
            className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] px-2 -mx-2 sm:mx-0 font-semibold text-[#B91C1C] hover:underline cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Sample Data</span>
          </button>
        </div>
      )}

      {/* Greeting Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#555A7D]">{fullDate}</p>
          <h1 className="font-display text-3xl sm:text-[34px] font-extrabold tracking-[-0.025em] text-[#141B41] mt-1 text-balance leading-tight">
            {greeting}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openFocusMode}
            className="inline-flex items-center gap-2.5 min-h-[44px] px-4.5 py-2.5 rounded-xl bg-[#141B41] text-white text-sm font-semibold hover:bg-[#1E2756] active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Timer className="w-4 h-4 text-[#F5B700]" />
            <span className={isRunning ? 'font-mono tabular-nums' : ''}>
              {isRunning
                ? `Focus ${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
                : 'Start Focus Mode'}
            </span>
          </button>
        </div>
      </section>

      {/* Top Hero Row: Next Class + Daily Completion Progress */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Dominant Focal Anchor: Next Class Information */}
        <div
          className="lg:col-span-7 relative overflow-hidden rounded-2xl bg-[#141B41] text-white p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_24px_rgba(20,27,65,0.14)]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 92% 12%, rgba(158, 146, 228, 0.22), transparent 46%)',
          }}
        >
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-semibold text-[#D8D1F5] tracking-wide">
                {nextClass.status === 'in-progress'
                  ? 'Class In Progress'
                  : nextClass.status === 'upcoming-today'
                  ? 'Next Class Today'
                  : nextClass.status === 'next-scheduled'
                  ? `Next Scheduled · ${nextClass.dayName}`
                  : 'Class Schedule'}
              </span>
              {nextClass.minutesDelta !== undefined && (
                <span className="text-xs font-mono tabular-nums font-semibold text-[#F5B700]">
                  {nextClass.status === 'in-progress'
                    ? `${nextClass.minutesDelta}m left`
                    : `In ${nextClass.minutesDelta >= 60 ? `${Math.floor(nextClass.minutesDelta / 60)}h ${nextClass.minutesDelta % 60}m` : `${nextClass.minutesDelta}m`}`}
                </span>
              )}
            </div>

            {nextClass.status !== 'none' && nextClass.classItem ? (
              <div>
                <p className="text-xs font-mono text-[#F5B700] font-semibold tracking-wide">
                  {nextClass.courseCode}
                </p>
                <h2 className="font-display text-2xl font-bold tracking-[-0.015em] text-white mt-1.5 text-balance leading-snug">
                  {nextClass.courseName}
                </h2>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-[#E2DCF8]">
                  <span className="inline-flex items-center gap-2 tabular-nums">
                    <Clock className="w-4 h-4 text-[#F5B700]" />
                    {formatTimeRange(nextClass.startTime!, nextClass.endTime!)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#F5B700]" />
                    {nextClass.venue}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  No upcoming classes scheduled
                </h2>
                <p className="text-sm text-[#D8D1F5] mt-1.5 leading-relaxed">
                  Add your weekly courses and lecture venues to see live next-class details here.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-5 border-t border-white/12">
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-2 -ml-2 sm:px-0 sm:ml-0 text-xs font-semibold text-[#EAE6FA] hover:text-[#F5B700] transition-colors cursor-pointer"
            >
              <span>View weekly timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2">
              {nextClass.classItem && (
                <button
                  type="button"
                  onClick={() => onEditClass(nextClass.classItem!)}
                  className="inline-flex items-center min-h-[44px] sm:min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#D8D1F5] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={onOpenNewClass}
                className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#F5B700]" />
                <span>Add Class</span>
              </button>
            </div>
          </div>
        </div>

        {/* Daily Completion Progress Card */}
        <div className="lg:col-span-5 card-surface rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[#555A7D]">
                Daily Completion Progress
              </span>
              <h2 className="font-display text-2xl font-bold tracking-[-0.015em] text-[#141B41] mt-1.5 tabular-nums">
                {dailyProgress.completedCount} of {dailyProgress.totalCount} tasks
              </h2>
              <p className="text-xs text-[#555A7D] mt-1">{dailyProgress.statusLabel}</p>
            </div>

            <div className="relative w-[88px] h-[88px] shrink-0 flex items-center justify-center">
              <svg className="w-[88px] h-[88px] -rotate-90" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r={progressRadius}
                  fill="none"
                  stroke="#EAE6FA"
                  strokeWidth="8"
                />
                <circle
                  cx="44"
                  cy="44"
                  r={progressRadius}
                  fill="none"
                  stroke={dailyProgress.percentage === 100 && dailyProgress.totalCount > 0 ? '#F5B700' : '#141B41'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={progressCircumference}
                  strokeDashoffset={progressOffset}
                  className="transition-[stroke-dashoffset] duration-300"
                />
              </svg>
              <span className="absolute font-mono text-sm font-bold text-[#141B41] tabular-nums">
                {dailyProgress.percentage}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-5 mt-5 border-t border-[#ECEAF4] tabular-nums">
            <div className="rounded-xl bg-[#F7F6FA] border border-[#ECEAF4] p-3.5">
              <div className="font-display text-xl font-bold text-[#141B41]">
                {todaysClasses.length}
              </div>
              <div className="text-xs text-[#555A7D] mt-0.5">Classes today</div>
            </div>
            <div className="rounded-xl bg-[#F7F6FA] border border-[#ECEAF4] p-3.5">
              <div className="font-display text-xl font-bold text-[#141B41]">
                {todaysFocusMinutes}m
              </div>
              <div className="text-xs text-[#555A7D] mt-0.5">Focus study today</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Workspace Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Today's Class Timetable */}
        <div className="lg:col-span-6 card-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#F4F2FC] text-[#6B5CD1] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </span>
              <h2 className="font-display text-base font-bold text-[#141B41]">
                Today&apos;s Timetable
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="inline-flex items-center min-h-[44px] px-2 -my-2 -mr-2 sm:min-h-0 sm:px-0 sm:my-0 sm:mr-0 text-xs font-semibold text-[#5E4EC4] hover:text-[#141B41] transition-colors cursor-pointer"
            >
              Full week
            </button>
          </div>

          {todaysClasses.length === 0 ? (
            <div className="rounded-xl bg-[#F7F6FA] border border-[#ECEAF4] p-6 text-center">
              <p className="text-sm font-semibold text-[#141B41]">No classes scheduled for today</p>
              <p className="text-xs text-[#555A7D] mt-1">
                Enjoy the open study block or add a class.
              </p>
              <button
                type="button"
                onClick={onOpenNewClass}
                className="mt-3.5 inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] px-4 py-1.5 rounded-xl bg-[#EAE6FA] text-xs font-semibold text-[#141B41] hover:bg-[#D8D1F5] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Class</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#ECEAF4]">
              {todaysClasses.map((cls) => {
                const startM = timeToMinutes(cls.startTime);
                const endM = timeToMinutes(cls.endTime);
                const isLive = currentMinutes >= startM && currentMinutes < endM;
                const isDone = currentMinutes >= endM;

                return (
                  <li key={cls.id} className="py-1 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => onEditClass(cls)}
                      className={`w-full min-h-[48px] text-left py-3 px-3 rounded-xl flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                        isLive
                          ? 'bg-[#EAE6FA]/85 hover:bg-[#EAE6FA]'
                          : 'hover:bg-[#F7F6FA]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#555A7D]">
                          <span className="font-mono font-semibold text-[#141B41]">
                            {cls.courseCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{cls.venue}</span>
                          {isLive && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#5E4EC4]">In Progress</span>
                            </>
                          )}
                          {isDone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Ended</span>
                            </>
                          )}
                        </div>
                        <p
                          className={`text-sm font-semibold mt-0.5 truncate ${
                            isDone ? 'text-[#555A7D]' : 'text-[#141B41]'
                          }`}
                        >
                          {cls.courseName}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-medium tabular-nums text-[#343A5E] shrink-0 pt-0.5">
                        {formatTime12h(cls.startTime)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Today's Tasks with Interactive Checkboxes */}
        <div className="lg:col-span-6 card-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#F4F2FC] text-[#6B5CD1] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h2 className="font-display text-base font-bold text-[#141B41]">Today&apos;s Tasks</h2>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <button
                type="button"
                onClick={onOpenNewTask}
                className="inline-flex items-center gap-1 min-h-[44px] px-2 -my-2 sm:min-h-0 sm:px-0 sm:my-0 text-xs font-semibold text-[#141B41] hover:text-[#5E4EC4] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="inline-flex items-center min-h-[44px] px-2 -my-2 -mr-2 sm:min-h-0 sm:px-0 sm:my-0 sm:mr-0 text-xs font-semibold text-[#5E4EC4] hover:text-[#141B41] transition-colors cursor-pointer"
              >
                All tasks
              </button>
            </div>
          </div>

          {todaysTasks.length === 0 ? (
            <div className="rounded-xl bg-[#F7F6FA] border border-[#ECEAF4] p-6 text-center">
              <p className="text-sm font-semibold text-[#141B41]">No tasks due today</p>
              <p className="text-xs text-[#555A7D] mt-1">
                Plan a task or reminder for today&apos;s study block.
              </p>
              <button
                type="button"
                onClick={onOpenNewTask}
                className="mt-3.5 inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] px-4 py-1.5 rounded-xl bg-[#EAE6FA] text-xs font-semibold text-[#141B41] hover:bg-[#D8D1F5] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#ECEAF4]">
              {todaysTasks.map((task) => (
                <li key={task.id} className="py-2.5 first:pt-0.5 last:pb-0.5 flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleTaskComplete(task.id)}
                    aria-label={
                      task.completed
                        ? `Mark "${task.title}" incomplete`
                        : `Mark "${task.title}" complete`
                    }
                    className="min-h-[44px] min-w-[44px] -ml-2 -my-1.5 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-150 ${
                        task.completed
                          ? 'bg-[#141B41] border-[#141B41] text-white scale-100'
                          : 'border-[#B9B3DA] bg-white hover:border-[#141B41]'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditTask(task)}
                    className="flex-1 min-w-0 text-left py-1 cursor-pointer group"
                  >
                    <p
                      className={`text-sm font-semibold transition-colors ${
                        task.completed
                          ? 'line-through text-[#6A6E8E]'
                          : 'text-[#141B41] group-hover:text-[#5E4EC4]'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#555A7D] mt-0.5">
                      {task.courseCode && (
                        <>
                          <span className="font-mono font-medium text-[#141B41]">
                            {task.courseCode}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span className="inline-flex items-center gap-1 capitalize">
                        <Flag
                          className={`w-3 h-3 ${
                            task.priority === 'high'
                              ? 'text-[#B91C1C]'
                              : task.priority === 'medium'
                              ? 'text-[#B45309]'
                              : 'text-[#555A7D]'
                          }`}
                        />
                        {task.priority} priority
                      </span>
                      {task.dueTime && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatTime12h(task.dueTime)}</span>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Assignments */}
        <div className="lg:col-span-6 card-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </span>
              <h2 className="font-display text-base font-bold text-[#141B41]">
                Upcoming Assignments
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('exams')}
              className="inline-flex items-center min-h-[44px] px-2 -my-2 -mr-2 sm:min-h-0 sm:px-0 sm:my-0 sm:mr-0 text-xs font-semibold text-[#5E4EC4] hover:text-[#141B41] transition-colors cursor-pointer shrink-0"
            >
              Manage all
            </button>
          </div>

          {upcomingAssignments.length === 0 ? (
            <p className="text-sm text-[#555A7D] py-4">No pending assignments.</p>
          ) : (
            <ul className="divide-y divide-[#ECEAF4]">
              {upcomingAssignments.map((item) => {
                const rel = formatRelativeDateLabel(item.date, todayKey);
                const isOverdue = parseDateAndTime(item.date, item.time).getTime() < now.getTime();
                return (
                  <li key={item.id} className="py-3 first:pt-1 last:pb-0 flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleAssessmentComplete(item.id)}
                      aria-label={`Mark assignment "${item.title}" complete`}
                      className="min-h-[44px] min-w-[44px] -ml-2 -my-1.5 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-md border border-[#B9B3DA] bg-white hover:border-[#141B41] transition-colors" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditAssessment(item)}
                      className="flex-1 min-w-0 text-left cursor-pointer group"
                    >
                      <p className="text-sm font-semibold text-[#141B41] group-hover:text-[#5E4EC4] transition-colors truncate">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#555A7D] mt-0.5">
                        <span className="font-mono font-semibold text-[#141B41]">
                          {item.courseCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={isOverdue ? 'text-[#B91C1C] font-semibold' : ''}>
                          {isOverdue ? 'Overdue' : rel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatTime12h(item.time)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming Tests and Examinations */}
        <div className="lg:col-span-6 card-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#141B41] text-[#F5B700] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </span>
              <h2 className="font-display text-base font-bold text-[#141B41] truncate">
                Upcoming Tests &amp; Examinations
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('exams')}
              className="inline-flex items-center min-h-[44px] px-2 -my-2 -mr-2 sm:min-h-0 sm:px-0 sm:my-0 sm:mr-0 text-xs font-semibold text-[#5E4EC4] hover:text-[#141B41] transition-colors cursor-pointer shrink-0"
            >
              Exam tracker
            </button>
          </div>

          {upcomingExamsAndTests.length === 0 ? (
            <p className="text-sm text-[#555A7D] py-4">
              No upcoming tests, quizzes, practicals, or exams.
            </p>
          ) : (
            <ul className="divide-y divide-[#ECEAF4]">
              {upcomingExamsAndTests.map((item) => {
                const cd = getCountdownParts(item.date, item.time, now);
                return (
                  <li key={item.id} className="py-1 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => onEditAssessment(item)}
                      className="w-full text-left py-2.5 px-2.5 -mx-1 rounded-xl hover:bg-[#F7F6FA] flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#555A7D]">
                          <span className="font-mono font-semibold text-[#141B41]">
                            {item.courseCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize font-medium text-[#5E4EC4]">{item.type}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{item.venue}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#141B41] truncate mt-0.5">
                          {item.title}
                        </p>
                        <p className="text-xs text-[#555A7D] mt-0.5 tabular-nums">
                          {formatShortDate(item.date)} at {formatTime12h(item.time)}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums text-[#141B41] bg-[#FEF3C7] px-2.5 py-1.5 rounded-xl shrink-0">
                        {cd.compactLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};
