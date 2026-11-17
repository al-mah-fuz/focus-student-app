import type { ClassItem, DayOfWeek } from '../types/academic';

export const DAY_NAMES: Record<DayOfWeek, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export const DAY_SHORT_NAMES: Record<DayOfWeek, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

export const DAYS_MON_TO_SUN: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, offsetDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + offsetDays);
  return toLocalDateKey(dt);
}

export function getDayOfWeekIso(date: Date = new Date()): DayOfWeek {
  const jsDay = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
}

export function getDayOfWeekFromKey(dateKey: string): DayOfWeek {
  const [y, m, d] = dateKey.split('-').map(Number);
  return getDayOfWeekIso(new Date(y, m - 1, d));
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function formatTime12h(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Late night study';
}

export function formatFullDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeDateLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === addDaysToDateKey(todayKey, 1)) return 'Tomorrow';
  if (dateKey === addDaysToDateKey(todayKey, -1)) return 'Yesterday';

  const [y1, m1, d1] = todayKey.split('-').map(Number);
  const [y2, m2, d2] = dateKey.split('-').map(Number);
  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));

  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return formatShortDate(dateKey);
}

export function parseDateAndTime(dateKey: string, timeStr: string = '23:59'): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = (timeStr || '23:59').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export interface CountdownParts {
  isPast: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  compactLabel: string;
}

export function getCountdownParts(
  dateKey: string,
  timeStr: string = '09:00',
  now: Date = new Date()
): CountdownParts {
  const target = parseDateAndTime(dateKey, timeStr);
  const diff = target.getTime() - now.getTime();
  const isPast = diff < 0;
  const abs = Math.abs(diff);

  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((abs / (1000 * 60)) % 60);
  const seconds = Math.floor((abs / 1000) % 60);

  let compactLabel = '';
  if (isPast) {
    if (days > 0) compactLabel = `${days}d ago`;
    else if (hours > 0) compactLabel = `${hours}h ago`;
    else compactLabel = `${minutes}m ago`;
  } else {
    if (days > 0) compactLabel = `${days}d ${hours}h ${minutes}m`;
    else if (hours > 0) compactLabel = `${hours}h ${minutes}m ${seconds}s`;
    else compactLabel = `${minutes}m ${seconds}s`;
  }

  return { isPast, totalMs: diff, days, hours, minutes, seconds, compactLabel };
}

export function isClassOnDate(cls: ClassItem, dateKey: string): boolean {
  const dow = getDayOfWeekFromKey(dateKey);
  if (cls.recurringWeekly) {
    return cls.dayOfWeek === dow;
  }
  if (cls.specificDate) {
    return cls.specificDate === dateKey;
  }
  return cls.dayOfWeek === dow;
}

export function sortClassesChronologically(list: ClassItem[]): ClassItem[] {
  return [...list].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
