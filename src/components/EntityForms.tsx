import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import type {
  AssessmentItem,
  AssessmentType,
  ClassColorTag,
  ClassItem,
  DayOfWeek,
  TaskItem,
  TaskKind,
  TaskPriority,
} from '../types/academic';
import {
  DAYS_MON_TO_SUN,
  DAY_NAMES,
  getDayOfWeekFromKey,
  getDayOfWeekIso,
  timeToMinutes,
  toLocalDateKey,
} from '../utils/dateUtils';
import { Modal } from './Modal';

/* ---------------- CLASS FORM MODAL ---------------- */

interface ClassFormModalProps {
  open: boolean;
  initialClass?: ClassItem | null;
  defaultDayOfWeek?: DayOfWeek;
  onClose: () => void;
}

const COLOR_OPTIONS: Array<{ value: ClassColorTag; label: string; swatch: string }> = [
  { value: 'navy', label: 'Deep Navy', swatch: 'bg-[#141B41]' },
  { value: 'lavender', label: 'Soft Lavender', swatch: 'bg-[#6B5CD1]' },
  { value: 'amber', label: 'Warm Yellow', swatch: 'bg-[#F5B700]' },
  { value: 'teal', label: 'Slate Teal', swatch: 'bg-[#0F766E]' },
  { value: 'rose', label: 'Muted Rose', swatch: 'bg-[#BE123C]' },
];

export const ClassFormModal: React.FC<ClassFormModalProps> = ({
  open,
  initialClass,
  defaultDayOfWeek,
  onClose,
}) => {
  const { saveClass, deleteClass } = useAcademic();
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [venue, setVenue] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(getDayOfWeekIso());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [recurringWeekly, setRecurringWeekly] = useState(true);
  const [specificDate, setSpecificDate] = useState(toLocalDateKey());
  const [instructor, setInstructor] = useState('');
  const [colorTag, setColorTag] = useState<ClassColorTag>('navy');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialClass) {
      setCourseName(initialClass.courseName);
      setCourseCode(initialClass.courseCode);
      setVenue(initialClass.venue);
      setDayOfWeek(initialClass.dayOfWeek);
      setStartTime(initialClass.startTime);
      setEndTime(initialClass.endTime);
      setRecurringWeekly(initialClass.recurringWeekly);
      setSpecificDate(initialClass.specificDate || toLocalDateKey());
      setInstructor(initialClass.instructor || '');
      setColorTag(initialClass.colorTag);
    } else {
      const targetDay = defaultDayOfWeek ?? getDayOfWeekIso();
      setCourseName('');
      setCourseCode('');
      setVenue('');
      setDayOfWeek(targetDay);
      setStartTime('09:00');
      setEndTime('10:30');
      setRecurringWeekly(true);
      setSpecificDate(toLocalDateKey());
      setInstructor('');
      setColorTag('navy');
    }
    setError(null);
  }, [open, initialClass, defaultDayOfWeek]);

  const handleSpecificDateChange = (nextDate: string) => {
    setSpecificDate(nextDate);
    if (nextDate && /^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      setDayOfWeek(getDayOfWeekFromKey(nextDate));
    }
  };

  const handleRecurringToggle = (checked: boolean) => {
    setRecurringWeekly(checked);
    if (!checked && specificDate && /^\d{4}-\d{2}-\d{2}$/.test(specificDate)) {
      setDayOfWeek(getDayOfWeekFromKey(specificDate));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !courseCode.trim()) {
      setError('Course name and course code are required.');
      return;
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError('Ending time must be later than starting time.');
      return;
    }
    if (!recurringWeekly && !specificDate) {
      setError('Please select a date for a single-session class.');
      return;
    }
    const resolvedDayOfWeek =
      !recurringWeekly && specificDate
        ? getDayOfWeekFromKey(specificDate)
        : dayOfWeek;

    setSubmitting(true);
    try {
      await saveClass({
        id: initialClass?.id,
        courseName: courseName.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        venue: venue.trim() || 'TBA',
        dayOfWeek: resolvedDayOfWeek,
        startTime,
        endTime,
        recurringWeekly,
        specificDate: recurringWeekly ? undefined : specificDate,
        instructor: instructor.trim() || undefined,
        colorTag,
        isSample: false,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialClass) return;
    setSubmitting(true);
    try {
      await deleteClass(initialClass.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialClass ? 'Edit Class' : 'Add Class'}
      subtitle="Saved directly to your local weekly timetable"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Course Code *</label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. CSC 301"
              className="w-full min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Course Name *</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Algorithms & Data Structures"
              className="w-full min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Lecture Venue</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Engineering Hall 204"
              className="w-full min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Instructor (optional)</label>
            <input
              type="text"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="e.g. Dr. Vance"
              className="w-full min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Day of Week</label>
            <select
              value={dayOfWeek}
              disabled={!recurringWeekly}
              onChange={(e) => setDayOfWeek(Number(e.target.value) as DayOfWeek)}
              className="w-full min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] disabled:opacity-65 focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            >
              {DAYS_MON_TO_SUN.map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
              required
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
              required
            />
          </div>
        </div>

        <div className="rounded-xl bg-[#F7F6FA] border border-[#E5E3F0] p-3.5 space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
            <div>
              <span className="text-sm font-medium text-[#141B41] block">Recurring weekly class</span>
              <span className="text-xs text-[#555A7D]">
                {recurringWeekly
                  ? `Repeats every ${DAY_NAMES[dayOfWeek]} across the semester`
                  : `Single session on ${DAY_NAMES[dayOfWeek]}`}
              </span>
            </div>
            <input
              type="checkbox"
              checked={recurringWeekly}
              onChange={(e) => handleRecurringToggle(e.target.checked)}
              className="w-5 h-5 accent-[#141B41] rounded cursor-pointer shrink-0"
            />
          </label>
          {!recurringWeekly && (
            <div className="min-w-0">
              <label className="block text-xs font-medium text-[#343A5E] mb-1.5">
                Specific Date (automatically sets {DAY_NAMES[dayOfWeek]})
              </label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => handleSpecificDateChange(e.target.value)}
                className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-white px-3 text-base sm:text-sm text-[#141B41] tabular-nums"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#343A5E] mb-2">Accent Marker</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColorTag(opt.value)}
                className={`inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  colorTag === opt.value
                    ? 'border-[#141B41] bg-[#EAE6FA] text-[#141B41]'
                    : 'border-[#E5E3F0] bg-white text-[#4D5275] hover:bg-[#F7F6FA]'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${opt.swatch}`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#ECEAF4]">
          {initialClass ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-[#4D5275] hover:bg-[#F4F2FC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold bg-[#141B41] text-white hover:bg-[#1E2756] transition-colors cursor-pointer disabled:opacity-60"
            >
              {initialClass ? 'Save Changes' : 'Add Class'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

/* ---------------- TASK / REMINDER FORM MODAL ---------------- */

interface TaskFormModalProps {
  open: boolean;
  initialTask?: TaskItem | null;
  defaultKind?: TaskKind;
  onClose: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  open,
  initialTask,
  defaultKind = 'task',
  onClose,
}) => {
  const { saveTask, deleteTask } = useAcademic();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [dueDate, setDueDate] = useState(toLocalDateKey());
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [kind, setKind] = useState<TaskKind>(defaultKind);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setCourseCode(initialTask.courseCode || '');
      setDueDate(initialTask.dueDate);
      setDueTime(initialTask.dueTime || '');
      setPriority(initialTask.priority);
      setKind(initialTask.kind);
    } else {
      setTitle('');
      setDescription('');
      setCourseCode('');
      setDueDate(toLocalDateKey());
      setDueTime(defaultKind === 'reminder' ? '17:00' : '');
      setPriority('medium');
      setKind(defaultKind);
    }
    setError(null);
  }, [open, initialTask, defaultKind]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    setSubmitting(true);
    try {
      await saveTask({
        id: initialTask?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        courseCode: courseCode.trim() ? courseCode.trim().toUpperCase() : undefined,
        dueDate: dueDate || toLocalDateKey(),
        dueTime: dueTime || undefined,
        priority,
        kind,
        completed: initialTask?.completed,
        isSample: false,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTask) return;
    setSubmitting(true);
    try {
      await deleteTask(initialTask.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialTask ? `Edit ${kind === 'reminder' ? 'Reminder' : 'Task'}` : `New ${kind === 'reminder' ? 'Reminder' : 'Task'}`}
      subtitle="Stored offline in IndexedDB"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F4F2FC] rounded-xl">
            {(['task', 'reminder'] as TaskKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`min-h-[44px] sm:min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  kind === k
                    ? 'bg-white text-[#141B41] shadow-xs'
                    : 'text-[#555A7D] hover:text-[#141B41]'
                }`}
              >
                {k === 'task' ? 'Task' : 'Reminder'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'reminder' ? 'e.g. Submit lab badge form' : 'e.g. Solve tutorial problem set'}
            className="w-full min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Course Code</label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. MTH 204"
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
              required
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Time (optional)</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Priority</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4F2FC] rounded-xl">
            {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`min-h-[44px] sm:min-h-[40px] rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  priority === p
                    ? p === 'high'
                      ? 'bg-[#141B41] text-[#FACC15]'
                      : 'bg-white text-[#141B41] shadow-xs'
                    : 'text-[#555A7D] hover:text-[#141B41]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Notes (optional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Extra context, chapters, or checklist details"
            className="w-full rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] p-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#ECEAF4]">
          {initialTask ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-[#4D5275] hover:bg-[#F4F2FC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold bg-[#141B41] text-white hover:bg-[#1E2756] transition-colors cursor-pointer disabled:opacity-60"
            >
              {initialTask ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

/* ---------------- ASSESSMENT (EXAM / TEST / QUIZ / ASSIGNMENT / PRACTICAL) FORM MODAL ---------------- */

interface AssessmentFormModalProps {
  open: boolean;
  initialAssessment?: AssessmentItem | null;
  defaultType?: AssessmentType;
  onClose: () => void;
}

const ASSESSMENT_TYPES: Array<{ value: AssessmentType; label: string }> = [
  { value: 'exam', label: 'Exam' },
  { value: 'test', label: 'Test' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practical', label: 'Practical' },
];

export const AssessmentFormModal: React.FC<AssessmentFormModalProps> = ({
  open,
  initialAssessment,
  defaultType = 'exam',
  onClose,
}) => {
  const { saveAssessment, deleteAssessment } = useAcademic();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AssessmentType>(defaultType);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [date, setDate] = useState(toLocalDateKey());
  const [time, setTime] = useState('09:00');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialAssessment) {
      setTitle(initialAssessment.title);
      setType(initialAssessment.type);
      setCourseCode(initialAssessment.courseCode);
      setCourseName(initialAssessment.courseName || '');
      setDate(initialAssessment.date);
      setTime(initialAssessment.time);
      setVenue(initialAssessment.venue);
      setNotes(initialAssessment.notes || '');
    } else {
      setTitle('');
      setType(defaultType);
      setCourseCode('');
      setCourseName('');
      setDate(toLocalDateKey());
      setTime(defaultType === 'assignment' ? '23:59' : '09:00');
      setVenue(defaultType === 'assignment' ? 'Online Portal' : '');
      setNotes('');
    }
    setError(null);
  }, [open, initialAssessment, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseCode.trim()) {
      setError('Title and course code are required.');
      return;
    }
    setSubmitting(true);
    try {
      await saveAssessment({
        id: initialAssessment?.id,
        title: title.trim(),
        type,
        courseCode: courseCode.trim().toUpperCase(),
        courseName: courseName.trim() || undefined,
        date: date || toLocalDateKey(),
        time: time || '09:00',
        venue: venue.trim() || 'TBA',
        notes: notes.trim() || undefined,
        completed: initialAssessment?.completed,
        isSample: false,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialAssessment) return;
    setSubmitting(true);
    try {
      await deleteAssessment(initialAssessment.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialAssessment ? 'Edit Academic Assessment' : 'Add Exam / Assessment'}
      subtitle="Tracks live countdown, venue, and course details"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Category</label>
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#F4F2FC] rounded-xl">
            {ASSESSMENT_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`flex-1 min-w-[78px] min-h-[44px] sm:min-h-[40px] px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  type === opt.value
                    ? 'bg-[#141B41] text-white'
                    : 'text-[#555A7D] hover:text-[#141B41]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mid-Semester Examination"
            className="w-full min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Course Code *</label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. CSC 301"
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
              required
            />
          </div>
          <div className="sm:col-span-2 min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Course Name (optional)</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Algorithms & Data Structures"
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
              required
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
              required
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Venue / Portal</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Hall B"
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] px-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#343A5E] mb-1.5">Syllabus / Instructions (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Chapters covered, permitted materials, submission link..."
            className="w-full rounded-xl border border-[#D8D1F5] bg-[#F7F6FA] p-3 text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/40 focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#ECEAF4]">
          {initialAssessment ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-[#4D5275] hover:bg-[#F4F2FC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold bg-[#141B41] text-white hover:bg-[#1E2756] transition-colors cursor-pointer disabled:opacity-60"
            >
              {initialAssessment ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
