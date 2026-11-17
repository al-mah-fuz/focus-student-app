import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Edit2,
  GraduationCap,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { useNow } from '../hooks/useNow';
import type { AssessmentItem, AssessmentType } from '../types/academic';
import {
  formatShortDate,
  formatTime12h,
  getCountdownParts,
  parseDateAndTime,
} from '../utils/dateUtils';

interface ExamsViewProps {
  onAddAssessment: (type?: AssessmentType) => void;
  onEditAssessment: (item: AssessmentItem) => void;
}

const TYPE_TABS: Array<{ id: 'all' | AssessmentType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'exam', label: 'Examinations' },
  { id: 'test', label: 'Tests' },
  { id: 'quiz', label: 'Quizzes' },
  { id: 'assignment', label: 'Assignments' },
  { id: 'practical', label: 'Practicals' },
];

export const ExamsView: React.FC<ExamsViewProps> = ({
  onAddAssessment,
  onEditAssessment,
}) => {
  const { assessments, toggleAssessmentComplete, deleteAssessment } = useAcademic();
  const now = useNow(1000);

  const [typeFilter, setTypeFilter] = useState<'all' | AssessmentType>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assessments
      .filter((a) => {
        if (!showCompleted && a.completed) return false;
        if (typeFilter !== 'all' && a.type !== typeFilter) return false;
        if (q) {
          const hay = `${a.title} ${a.courseCode} ${a.courseName ?? ''} ${a.venue}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (
          parseDateAndTime(a.date, a.time).getTime() -
          parseDateAndTime(b.date, b.time).getTime()
        );
      });
  }, [assessments, typeFilter, showCompleted, searchQuery]);

  const pendingCount = useMemo(
    () => assessments.filter((a) => !a.completed).length,
    [assessments]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#5E4EC4] tabular-nums">
            {pendingCount} upcoming {pendingCount === 1 ? 'assessment' : 'assessments'} tracked
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#141B41] mt-0.5">
            Academic Exam Tracker
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onAddAssessment(typeFilter === 'all' ? 'exam' : typeFilter)}
          className="inline-flex items-center gap-2 min-h-[44px] px-4.5 py-2 rounded-xl bg-[#141B41] text-white text-sm font-semibold hover:bg-[#1E2756] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4 text-[#F5B700]" />
          <span>Add Assessment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-[#E6E3F1] rounded-2xl overflow-x-auto no-scrollbar">
          {TYPE_TABS.map((tab) => {
            const active = typeFilter === tab.id;
            const count =
              tab.id === 'all'
                ? assessments.filter((a) => showCompleted || !a.completed).length
                : assessments.filter(
                    (a) => a.type === tab.id && (showCompleted || !a.completed)
                  ).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 ${
                  active
                    ? 'bg-[#141B41] text-white'
                    : 'text-[#555A7D] hover:bg-[#F4F2FC] hover:text-[#141B41]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    active ? 'text-[#F5B700]' : 'text-[#555A7D]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#555A7D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course code, title, or venue..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white border border-[#E6E3F1] text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/35"
            />
          </div>

          <label className="inline-flex items-center gap-2.5 min-h-[44px] px-4 rounded-xl bg-white border border-[#E6E3F1] text-xs font-semibold text-[#141B41] cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-4 h-4 accent-[#141B41] rounded cursor-pointer"
            />
            <span>Show completed</span>
          </label>
        </div>
      </div>

      {/* Assessments Grid */}
      {filtered.length === 0 ? (
        <div className="card-surface rounded-2xl p-10 text-center">
          <GraduationCap className="w-8 h-8 text-[#6B5CD1] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#141B41]">No assessments scheduled</p>
          <p className="text-xs text-[#555A7D] mt-1">
            Add upcoming examinations, tests, quizzes, assignments, or practicals to track live countdowns.
          </p>
          <button
            type="button"
            onClick={() => onAddAssessment('exam')}
            className="mt-4 inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-[#EAE6FA] text-xs font-semibold text-[#141B41] hover:bg-[#D8D1F5] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Examination</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const cd = getCountdownParts(item.date, item.time, now);
            const isUrgent = !item.completed && !cd.isPast && cd.days < 3;

            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-colors ${
                  item.completed
                    ? 'bg-white/65 border-[#E6E3F1] opacity-75'
                    : 'card-surface'
                }`}
              >
                <div>
                  {/* Metadata Line */}
                  <div className="flex items-center justify-between gap-2 text-xs text-[#555A7D]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[#141B41]">
                        {item.courseCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize font-semibold text-[#5E4EC4]">
                        {item.type}
                      </span>
                      {item.completed && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#15803D]">Completed</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 -mr-1.5">
                      <button
                        type="button"
                        onClick={() => void toggleAssessmentComplete(item.id)}
                        aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                        className={`min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                          item.completed
                            ? 'bg-[#141B41] text-white'
                            : 'bg-[#F4F2FC] text-[#555A7D] hover:bg-[#EAE6FA] hover:text-[#141B41]'
                        }`}
                        title={item.completed ? 'Mark incomplete' : 'Mark completed'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditAssessment(item)}
                        aria-label={`Edit ${item.title}`}
                        className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-[#555A7D] hover:bg-[#F4F2FC] hover:text-[#141B41] transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAssessment(item.id)}
                        aria-label={`Delete ${item.title}`}
                        className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-[#555A7D] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h2
                    className={`font-display text-lg font-bold tracking-[-0.01em] mt-2.5 leading-snug ${
                      item.completed ? 'line-through text-[#6A6E8E]' : 'text-[#141B41]'
                    }`}
                  >
                    {item.title}
                  </h2>
                  {item.courseName && (
                    <p className="text-xs text-[#555A7D] mt-0.5">{item.courseName}</p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-[#4C5175] mt-2.5 line-clamp-2 leading-relaxed">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Date, Venue & Automatically Updating Countdown */}
                <div className="mt-5 pt-4 border-t border-[#ECEAF4] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1.5 text-xs text-[#343A5E]">
                    <div className="flex items-center gap-1.5 tabular-nums font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#6B5CD1] shrink-0" />
                      <span>
                        {formatShortDate(item.date)} at {formatTime12h(item.time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#6B5CD1] shrink-0" />
                      <span>{item.venue}</span>
                    </div>
                  </div>

                  {!item.completed && (
                    <div
                      className={`rounded-xl px-3.5 py-2 font-mono tabular-nums ${
                        cd.isPast
                          ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                          : isUrgent
                          ? 'bg-[#FEF3C7] text-[#141B41] border border-[#F5B700]/40'
                          : 'bg-[#141B41] text-white'
                      }`}
                    >
                      <div className="text-[10px] font-sans font-semibold opacity-80 mb-0.5">
                        {cd.isPast ? 'Elapsed' : isUrgent ? 'Due Soon' : 'Countdown'}
                      </div>
                      {cd.isPast ? (
                        <div className="text-sm font-bold">{cd.compactLabel}</div>
                      ) : (
                        <div className="flex items-baseline gap-1.5 text-sm font-bold">
                          <span>{cd.days}<span className="text-[10px] font-normal opacity-75 ml-0.5">d</span></span>
                          <span>{String(cd.hours).padStart(2, '0')}<span className="text-[10px] font-normal opacity-75 ml-0.5">h</span></span>
                          <span>{String(cd.minutes).padStart(2, '0')}<span className="text-[10px] font-normal opacity-75 ml-0.5">m</span></span>
                          <span>{String(cd.seconds).padStart(2, '0')}<span className="text-[10px] font-normal opacity-75 ml-0.5">s</span></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
