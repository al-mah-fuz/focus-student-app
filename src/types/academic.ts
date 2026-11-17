export type ActiveSection = 'home' | 'schedule' | 'tasks' | 'notes' | 'exams';

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Monday ... 7 = Sunday

export type ClassColorTag = 'navy' | 'lavender' | 'amber' | 'teal' | 'rose';

export interface ClassItem {
  id: string;
  courseName: string;
  courseCode: string;
  venue: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm" 24-hour
  endTime: string;   // "HH:mm" 24-hour
  recurringWeekly: boolean;
  specificDate?: string; // "YYYY-MM-DD" when recurringWeekly is false
  instructor?: string;
  colorTag: ClassColorTag;
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskKind = 'task' | 'reminder';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  courseCode?: string;
  dueDate: string; // "YYYY-MM-DD"
  dueTime?: string; // "HH:mm"
  priority: TaskPriority;
  kind: TaskKind;
  completed: boolean;
  completedAt?: number;
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  courseCode?: string;
  pinned: boolean;
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type AssessmentType = 'exam' | 'test' | 'quiz' | 'assignment' | 'practical';

export interface AssessmentItem {
  id: string;
  title: string;
  type: AssessmentType;
  courseCode: string;
  courseName?: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  venue: string;
  notes?: string;
  completed: boolean;
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type FocusTimerMode = 'focus-25' | 'focus-50' | 'short-break' | 'long-break';

export interface FocusSessionItem {
  id: string;
  mode: FocusTimerMode;
  durationMinutes: number;
  label?: string;
  completedAt: number;
  dateKey: string; // "YYYY-MM-DD"
  isSample?: boolean;
}

export interface AcademicState {
  classes: ClassItem[];
  tasks: TaskItem[];
  notes: NoteItem[];
  assessments: AssessmentItem[];
  focusSessions: FocusSessionItem[];
}

export type QuickCreateTarget =
  | 'class'
  | 'task'
  | 'assignment'
  | 'test'
  | 'exam'
  | 'reminder'
  | 'note';
