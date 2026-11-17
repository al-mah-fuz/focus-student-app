import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Edit2, MapPin, Plus, Repeat, Star, Trash2, User } from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { useNow } from '../hooks/useNow';
import type { ClassColorTag, ClassItem, DayOfWeek } from '../types/academic';
import {
  DAYS_MON_TO_SUN,
  DAY_NAMES,
  DAY_SHORT_NAMES,
  formatTimeRange,
  getDayOfWeekIso,
  sortClassesChronologically,
} from '../utils/dateUtils';

interface ScheduleViewProps {
  onAddClassForDay: (day: DayOfWeek) => void;
  onEditClass: (cls: ClassItem) => void;
}

const DOT_COLOR_MAP: Record<ClassColorTag, string> = {
  navy: 'bg-[#141B41]',
  lavender: 'bg-[#6B5CD1]',
  amber: 'bg-[#F5B700]',
  teal: 'bg-[#0F766E]',
  rose: 'bg-[#BE123C]',
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  onAddClassForDay,
  onEditClass,
}) => {
  const { classes, deleteClass } = useAcademic();
  const now = useNow(30000);
  const currentDow = getDayOfWeekIso(now);

  const [selectedMobileDay, setSelectedMobileDay] = useState<DayOfWeek>(currentDow);
  const [mobileShowFullWeek, setMobileShowFullWeek] = useState(false);

  const classesByDay = useMemo(() => {
    const map: Record<DayOfWeek, ClassItem[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
    };
    for (const cls of classes) {
      map[cls.dayOfWeek].push(cls);
    }
    for (const d of DAYS_MON_TO_SUN) {
      map[d] = sortClassesChronologically(map[d]);
    }
    return map;
  }, [classes]);

  const todaysCount = classesByDay[currentDow].length;

  const renderClassCard = (cls: ClassItem, isTodayColumn: boolean) => (
    <div
      key={cls.id}
      className={`rounded-xl border p-3.5 transition-all duration-150 ${
        isTodayColumn
          ? 'bg-white border-[#C5BCF5] shadow-[0_2px_8px_rgba(107,92,209,0.08)]'
          : 'bg-white border-[#E6E3F1] hover:border-[#D4CCF3]'
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0 pt-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLOR_MAP[cls.colorTag]}`} />
          <span className="font-mono text-xs font-bold text-[#141B41] truncate">
            {cls.courseCode}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 -mr-1.5 -mt-1.5">
          <button
            type="button"
            onClick={() => onEditClass(cls)}
            aria-label={`Edit ${cls.courseName}`}
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-[#555A7D] hover:bg-[#F4F2FC] hover:text-[#141B41] transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void deleteClass(cls.id)}
            aria-label={`Delete ${cls.courseName}`}
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-[#555A7D] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-[#141B41] mt-1 leading-snug">
        {cls.courseName}
      </h3>

      <div className="mt-3 space-y-1.5 text-xs text-[#555A7D]">
        <div className="flex items-center gap-1.5 tabular-nums font-medium text-[#141B41]">
          <Clock className="w-3.5 h-3.5 text-[#6B5CD1] shrink-0" />
          <span>{formatTimeRange(cls.startTime, cls.endTime)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#6B5CD1] shrink-0" />
          <span className="truncate">{cls.venue}</span>
        </div>
        {cls.instructor && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#6B5CD1] shrink-0" />
            <span className="truncate">{cls.instructor}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-[#555A7D] pt-0.5">
          <Repeat className="w-3 h-3 text-[#6B5CD1] shrink-0" />
          <span>
            {cls.recurringWeekly
              ? 'Recurring weekly'
              : cls.specificDate
              ? `Single session · ${cls.specificDate}`
              : 'Single session'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#5E4EC4] tabular-nums">
            {classes.length} total {classes.length === 1 ? 'class' : 'classes'} · {todaysCount} today ({DAY_NAMES[currentDow]})
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#141B41] mt-0.5">
            Weekly Schedule
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileShowFullWeek((v) => !v)}
            className="lg:hidden min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#E5E3F0] text-xs font-semibold text-[#141B41] hover:bg-[#F4F2FC] transition-colors cursor-pointer"
          >
            {mobileShowFullWeek ? 'Day View' : 'All Week'}
          </button>
          <button
            type="button"
            onClick={() => onAddClassForDay(currentDow)}
            className="inline-flex items-center gap-2 min-h-[44px] px-4.5 py-2 rounded-xl bg-[#141B41] text-white text-sm font-semibold hover:bg-[#1E2756] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#F5B700]" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Mobile Day Selector (hidden on lg+ or when Full Week toggle is active) */}
      <div className="lg:hidden">
        {!mobileShowFullWeek && (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1 p-1 bg-white border border-[#E6E3F1] rounded-2xl shadow-xs">
              {DAYS_MON_TO_SUN.map((day) => {
                const isToday = day === currentDow;
                const isSelected = day === selectedMobileDay;
                const count = classesByDay[day].length;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedMobileDay(day)}
                    className={`min-h-[52px] px-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#141B41] text-white'
                        : isToday
                        ? 'bg-[#EAE6FA] text-[#141B41]'
                        : 'text-[#555A7D] hover:bg-[#F7F6FA]'
                    }`}
                  >
                    <span>{DAY_SHORT_NAMES[day]}</span>
                    <span
                      className={`text-[10px] tabular-nums ${
                        isSelected
                          ? 'text-[#F5B700]'
                          : isToday
                          ? 'text-[#5E4EC4]'
                          : 'text-[#555A7D]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                selectedMobileDay === currentDow
                  ? 'bg-[#F4F2FC] border-[#C5BCF5]'
                  : 'bg-white border-[#E6E3F1]'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-[#141B41]">
                    {DAY_NAMES[selectedMobileDay]}
                  </h2>
                  {selectedMobileDay === currentDow && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5E4EC4]">
                      <Star className="w-3.5 h-3.5 fill-[#F5B700] text-[#F5B700]" />
                      Today
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onAddClassForDay(selectedMobileDay)}
                  className="inline-flex items-center gap-1 min-h-[40px] px-3 rounded-xl bg-white border border-[#D4CCF3] text-xs font-semibold text-[#141B41] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {classesByDay[selectedMobileDay].length === 0 ? (
                <div className="rounded-xl bg-white/85 border border-[#ECEAF4] p-7 text-center">
                  <Calendar className="w-6 h-6 text-[#6B5CD1] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#141B41]">
                    No classes on {DAY_NAMES[selectedMobileDay]}
                  </p>
                  <p className="text-xs text-[#555A7D] mt-1">
                    Tap Add above to schedule a lecture or lab.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classesByDay[selectedMobileDay].map((cls) =>
                    renderClassCard(cls, selectedMobileDay === currentDow)
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Monday–Sunday Timetable Grid (and Mobile Full Week Stack) */}
      <div
        className={`${
          mobileShowFullWeek ? 'grid' : 'hidden lg:grid'
        } grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5 items-stretch`}
      >
        {DAYS_MON_TO_SUN.map((day) => {
          const isToday = day === currentDow;
          const dayClasses = classesByDay[day];

          return (
            <section
              key={day}
              className={`rounded-2xl border p-3 min-h-[300px] flex flex-col transition-colors ${
                isToday
                  ? 'bg-[#EAE6FA]/70 border-[#9E92E4] shadow-[0_4px_18px_rgba(107,92,209,0.08)]'
                  : 'bg-[#F4F2FC]/55 border-[#E5E3F0]'
              }`}
            >
              <header
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 mb-3 ${
                  isToday
                    ? 'bg-[#141B41] text-white'
                    : 'bg-white border border-[#ECEAF4] text-[#141B41]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-sm font-bold truncate">
                      {DAY_NAMES[day]}
                    </h2>
                    {isToday && (
                      <Star
                        className="w-3.5 h-3.5 fill-[#F5B700] text-[#F5B700] shrink-0"
                        aria-label="Current day"
                      />
                    )}
                  </div>
                  <p
                    className={`text-[11px] tabular-nums ${
                      isToday ? 'text-[#D8D1F5]' : 'text-[#555A7D]'
                    }`}
                  >
                    {isToday ? 'Today · ' : ''}
                    {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddClassForDay(day)}
                  aria-label={`Add class on ${DAY_NAMES[day]}`}
                  className={`min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 ${
                    isToday
                      ? 'bg-white/14 text-[#F5B700] hover:bg-white/24'
                      : 'bg-[#F4F2FC] text-[#141B41] hover:bg-[#141B41] hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </header>

              {dayClasses.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-2">
                  <p className="text-xs font-medium text-[#555A7D]">Open day</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dayClasses.map((cls) => renderClassCard(cls, isToday))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
