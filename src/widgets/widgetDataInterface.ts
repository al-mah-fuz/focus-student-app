import { getMeta, setMeta } from '../db/indexedDb';
import type {
  AcademicState,
  AssessmentItem,
  ClassItem,
  TaskItem,
} from '../types/academic';
import {
  DAY_NAMES,
  addDaysToDateKey,
  formatTime12h,
  getCountdownParts,
  getDayOfWeekFromKey,
  getDayOfWeekIso,
  isClassOnDate,
  parseDateAndTime,
  sortClassesChronologically,
  timeToMinutes,
  toLocalDateKey,
} from '../utils/dateUtils';

/**
 * Schema version for the native widget snapshot contract.
 * Increment only when making breaking structural changes to `NativeWidgetSnapshot`.
 */
export const WIDGET_SCHEMA_VERSION = 2 as const;

/** IndexedDB `appMeta` key where the latest snapshot is persisted after every app update. */
export const WIDGET_INDEXEDDB_META_KEY = 'nativeWidgetSnapshot' as const;

/** Cross-context BroadcastChannel name for synchronizing widget consumers across tabs/workers. */
export const WIDGET_SYNC_CHANNEL = 'focus_star_widget_sync_v2' as const;

/** DOM CustomEvent dispatched on `window` whenever the widget snapshot changes. */
export const WIDGET_UPDATE_EVENT = 'focus:widget-data-updated' as const;

/**
 * Canonical task item exposed to native Android & iOS widgets.
 */
export interface WidgetTaskEntry {
  id: string;
  title: string;
  courseCode?: string;
  dueTime?: string;
  priority: TaskItem['priority'];
  kind: TaskItem['kind'];
  completed: boolean;
  completedAt?: number;
}

/**
 * All tasks scheduled for today (both active and completed), ordered by
 * incomplete first, then priority (high -> medium -> low), then due time.
 */
export interface WidgetTodaysTasks {
  dateKey: string;
  totalCount: number;
  completedCount: number;
  remainingCount: number;
  items: WidgetTaskEntry[];
}

/**
 * Incomplete tasks remaining for today (subset of `WidgetTodaysTasks`).
 */
export interface WidgetRemainingTasks {
  dateKey: string;
  remainingCount: number;
  items: Array<Omit<WidgetTaskEntry, 'completed' | 'completedAt'>>;
}

/**
 * Task completion summary for today's tasks, suitable for progress rings,
 * lock-screen circular gauges, and completion bars.
 */
export interface WidgetDailyProgress {
  dateKey: string;
  completedCount: number;
  totalCount: number;
  remainingCount: number;
  percentage: number;
  /** Compact ratio string such as `"3/5"` for lock-screen gauges. */
  fractionLabel: string;
  isAllComplete: boolean;
  statusLabel: string;
}

/**
 * Next or currently active class entry for schedule widgets.
 * Includes explicit epoch timestamps and ISO strings so native Android
 * Chronometer and iOS WidgetKit `Text(date, style: .relative)` can update
 * without running JavaScript.
 */
export interface WidgetNextClass {
  status: 'in-progress' | 'upcoming-today' | 'next-scheduled' | 'none';
  courseCode?: string;
  courseName?: string;
  venue?: string;
  dayName?: string;
  /** Local `"YYYY-MM-DD"` date key of the occurrence. */
  dateKey?: string;
  startTime?: string;
  endTime?: string;
  startTimestampMs?: number;
  endTimestampMs?: number;
  startIso?: string;
  endIso?: string;
  /** Minutes remaining if `in-progress`, or minutes until start if `upcoming-today`. */
  minutesDelta?: number;
  classItem?: ClassItem;
}

/**
 * Single upcoming assessment item structured for native examination widgets.
 */
export interface WidgetExamEntry {
  id: string;
  title: string;
  type: AssessmentItem['type'];
  courseCode: string;
  courseName?: string;
  date: string;
  time: string;
  venue: string;
  /** Target timestamp in epoch milliseconds for native OS countdown rendering. */
  targetTimestampMs: number;
  targetIso: string;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  compactCountdown: string;
}

/**
 * Next upcoming examination (prioritizing formal `'exam'` items, then falling
 * back to `'test' | 'quiz' | 'practical'`) plus up to 3 upcoming exams/tests.
 */
export interface WidgetNextExamination {
  hasExamination: boolean;
  item?: AssessmentItem;
  id?: string;
  title?: string;
  type?: AssessmentItem['type'];
  courseCode?: string;
  courseName?: string;
  venue?: string;
  date?: string;
  time?: string;
  targetTimestampMs?: number;
  targetIso?: string;
  daysRemaining?: number;
  hoursRemaining?: number;
  minutesRemaining?: number;
  compactCountdown?: string;
  upcomingList: WidgetExamEntry[];
}

/**
 * Pre-formatted compact strings tailored for constrained lock-screen slots
 * (iOS WidgetKit `accessoryCircular` / `accessoryRectangular` / `accessoryInline`
 * and Android Jetpack Glance / lock-screen surfaces).
 */
export interface WidgetLockScreenSummary {
  tasksGauge: {
    completed: number;
    total: number;
    percentage: number;
    shortLabel: string;
  };
  nextClassLine: string;
  nextExamLine: string;
  inlineSummary: string;
}

/**
 * Deep-link routes inside the PWA/native shell when a user taps a widget.
 */
export interface WidgetDeepLinks {
  home: string;
  tasks: string;
  schedule: string;
  exams: string;
  focus: string;
}

/**
 * Complete synchronized data payload exposed by FOCUS⭐️ for native Android
 * (AppWidget / Jetpack Glance) and iOS (WidgetKit) extensions.
 *
 * IMPORTANT: The web PWA itself does not simulate or claim native OS lock-screen
 * or home-screen widgets; this contract prepares and persists the live data layer
 * that native wrappers consume.
 */
export interface NativeWidgetSnapshot {
  schemaVersion: typeof WIDGET_SCHEMA_VERSION;
  /** Monotonic sequence counter incremented whenever the persisted snapshot updates. */
  sequence: number;
  /** Epoch milliseconds when this snapshot was synchronized. */
  updatedAtMs: number;
  /** ISO-8601 UTC timestamp when this snapshot was built. */
  generatedAtIso: string;
  /** Local IANA timezone identifier (e.g. `"America/Los_Angeles"`). */
  timezone: string;
  /** Recommended timeline refresh hint in milliseconds for native WidgetKit/WorkManager. */
  staleAfterMs: number;
  platformNote: string;
  todaysTasks: WidgetTodaysTasks;
  todaysRemainingTasks: WidgetRemainingTasks;
  dailyTaskProgress: WidgetDailyProgress;
  nextUpcomingClass: WidgetNextClass;
  nextExamination: WidgetNextExamination;
  lockScreenSummary: WidgetLockScreenSummary;
  deepLinks: WidgetDeepLinks;
}

export type WidgetDataListener = (snapshot: NativeWidgetSnapshot) => void;

/**
 * Runtime interface exposed on `window.FocusWidgetBridge` so a future native
 * Android WebView/TWA or iOS WKWebView host can pull the latest snapshot or
 * subscribe to live updates pushed from `AcademicContext`.
 */
export interface FocusWidgetBridge {
  readonly schemaVersion: typeof WIDGET_SCHEMA_VERSION;
  readonly indexedDbStore: 'appMeta';
  readonly indexedDbKey: typeof WIDGET_INDEXEDDB_META_KEY;
  readonly eventName: typeof WIDGET_UPDATE_EVENT;
  readonly channelName: typeof WIDGET_SYNC_CHANNEL;
  getSnapshot: () => NativeWidgetSnapshot | null;
  getSnapshotAsync: () => Promise<NativeWidgetSnapshot | null>;
  subscribe: (listener: WidgetDataListener) => () => void;
}

interface NativeHostWindow extends Window {
  FocusWidgetBridge?: FocusWidgetBridge;
  AndroidFocusBridge?: {
    onWidgetDataUpdated?: (snapshotJson: string) => void;
  };
  webkit?: {
    messageHandlers?: {
      focusWidgetData?: {
        postMessage?: (snapshot: NativeWidgetSnapshot) => void;
      };
    };
  };
}

const PRIORITY_WEIGHT: Record<TaskItem['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Selects all tasks due today (active + completed), ordered by incomplete first,
 * then priority (`high`, `medium`, `low`), then due time.
 */
export function selectTodaysTasks(
  tasks: TaskItem[],
  now: Date = new Date()
): WidgetTodaysTasks {
  const todayKey = toLocalDateKey(now);
  const todays = tasks
    .filter((t) => t.dueDate === todayKey)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (pDiff !== 0) return pDiff;
      if (a.dueTime && b.dueTime) return timeToMinutes(a.dueTime) - timeToMinutes(b.dueTime);
      if (a.dueTime) return -1;
      if (b.dueTime) return 1;
      return a.createdAt - b.createdAt;
    });

  const completedCount = todays.filter((t) => t.completed).length;

  return {
    dateKey: todayKey,
    totalCount: todays.length,
    completedCount,
    remainingCount: todays.length - completedCount,
    items: todays.map((t) => ({
      id: t.id,
      title: t.title,
      courseCode: t.courseCode,
      dueTime: t.dueTime,
      priority: t.priority,
      kind: t.kind,
      completed: t.completed,
      completedAt: t.completedAt,
    })),
  };
}

/**
 * Selects only incomplete tasks due today, sorted by priority and due time.
 */
export function selectTodaysRemainingTasks(
  tasks: TaskItem[],
  now: Date = new Date()
): WidgetRemainingTasks {
  const today = selectTodaysTasks(tasks, now);
  const remaining = today.items.filter((t) => !t.completed);

  return {
    dateKey: today.dateKey,
    remainingCount: remaining.length,
    items: remaining.map(({ completed: _c, completedAt: _ca, ...rest }) => rest),
  };
}

/**
 * Selects the currently active class or the next upcoming class (checking today first,
 * then up to 14 days ahead across both recurring weekly and single-session classes).
 */
export function selectNextUpcomingClass(
  classes: ClassItem[],
  now: Date = new Date()
): WidgetNextClass {
  if (classes.length === 0) {
    return { status: 'none' };
  }

  const todayKey = toLocalDateKey(now);
  const todayDow = getDayOfWeekIso(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaysClasses = sortClassesChronologically(
    classes.filter((c) => isClassOnDate(c, todayKey))
  );

  const active = todaysClasses.find((c) => {
    const start = timeToMinutes(c.startTime);
    const end = timeToMinutes(c.endTime);
    return currentMinutes >= start && currentMinutes < end;
  });

  if (active) {
    const startDate = parseDateAndTime(todayKey, active.startTime);
    const endDate = parseDateAndTime(todayKey, active.endTime);
    const remainingMins = Math.max(1, timeToMinutes(active.endTime) - currentMinutes);
    return {
      status: 'in-progress',
      courseCode: active.courseCode,
      courseName: active.courseName,
      venue: active.venue,
      dayName: DAY_NAMES[todayDow],
      dateKey: todayKey,
      startTime: active.startTime,
      endTime: active.endTime,
      startTimestampMs: startDate.getTime(),
      endTimestampMs: endDate.getTime(),
      startIso: startDate.toISOString(),
      endIso: endDate.toISOString(),
      minutesDelta: remainingMins,
      classItem: active,
    };
  }

  const laterToday = todaysClasses.find((c) => timeToMinutes(c.startTime) > currentMinutes);
  if (laterToday) {
    const startDate = parseDateAndTime(todayKey, laterToday.startTime);
    const endDate = parseDateAndTime(todayKey, laterToday.endTime);
    const minsUntil = timeToMinutes(laterToday.startTime) - currentMinutes;
    return {
      status: 'upcoming-today',
      courseCode: laterToday.courseCode,
      courseName: laterToday.courseName,
      venue: laterToday.venue,
      dayName: DAY_NAMES[todayDow],
      dateKey: todayKey,
      startTime: laterToday.startTime,
      endTime: laterToday.endTime,
      startTimestampMs: startDate.getTime(),
      endTimestampMs: endDate.getTime(),
      startIso: startDate.toISOString(),
      endIso: endDate.toISOString(),
      minutesDelta: minsUntil,
      classItem: laterToday,
    };
  }

  for (let offset = 1; offset <= 14; offset++) {
    const targetKey = addDaysToDateKey(todayKey, offset);
    const targetDow = getDayOfWeekFromKey(targetKey);
    const dayClasses = sortClassesChronologically(
      classes.filter((c) => isClassOnDate(c, targetKey))
    );
    if (dayClasses.length > 0) {
      const nextCls = dayClasses[0];
      const startDate = parseDateAndTime(targetKey, nextCls.startTime);
      const endDate = parseDateAndTime(targetKey, nextCls.endTime);
      return {
        status: 'next-scheduled',
        courseCode: nextCls.courseCode,
        courseName: nextCls.courseName,
        venue: nextCls.venue,
        dayName: offset === 1 ? 'Tomorrow' : DAY_NAMES[targetDow],
        dateKey: targetKey,
        startTime: nextCls.startTime,
        endTime: nextCls.endTime,
        startTimestampMs: startDate.getTime(),
        endTimestampMs: endDate.getTime(),
        startIso: startDate.toISOString(),
        endIso: endDate.toISOString(),
        classItem: nextCls,
      };
    }
  }

  return { status: 'none' };
}

/**
 * Computes today's task completion progress metrics for widgets and home dashboard.
 */
export function selectDailyTaskProgress(
  tasks: TaskItem[],
  now: Date = new Date()
): WidgetDailyProgress {
  const todayKey = toLocalDateKey(now);
  const todaysTasks = tasks.filter((t) => t.dueDate === todayKey);
  const totalCount = todaysTasks.length;
  const completedCount = todaysTasks.filter((t) => t.completed).length;
  const remainingCount = totalCount - completedCount;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const isAllComplete = totalCount > 0 && remainingCount === 0;

  let statusLabel = 'No tasks scheduled today';
  if (isAllComplete) {
    statusLabel = 'All tasks completed';
  } else if (totalCount > 0) {
    statusLabel = `${remainingCount} remaining today`;
  }

  return {
    dateKey: todayKey,
    completedCount,
    totalCount,
    remainingCount,
    percentage,
    fractionLabel: `${completedCount}/${totalCount}`,
    isAllComplete,
    statusLabel,
  };
}

/**
 * Selects the next upcoming examination (preferring `'exam'` entries and falling
 * back to `'test' | 'quiz' | 'practical'`) along with up to 3 upcoming entries.
 */
export function selectNextExamination(
  assessments: AssessmentItem[],
  now: Date = new Date()
): WidgetNextExamination {
  const upcomingExams = assessments
    .filter((a) => !a.completed && a.type === 'exam')
    .filter((a) => parseDateAndTime(a.date, a.time).getTime() >= now.getTime())
    .sort(
      (a, b) =>
        parseDateAndTime(a.date, a.time).getTime() -
        parseDateAndTime(b.date, b.time).getTime()
    );

  const upcomingOtherTests = assessments
    .filter((a) => !a.completed && (a.type === 'test' || a.type === 'quiz' || a.type === 'practical'))
    .filter((a) => parseDateAndTime(a.date, a.time).getTime() >= now.getTime())
    .sort(
      (a, b) =>
        parseDateAndTime(a.date, a.time).getTime() -
        parseDateAndTime(b.date, b.time).getTime()
    );

  const pool = upcomingExams.length > 0 ? upcomingExams : upcomingOtherTests;

  if (pool.length === 0) {
    return {
      hasExamination: false,
      upcomingList: [],
    };
  }

  const mapEntry = (assessment: AssessmentItem): WidgetExamEntry => {
    const targetDate = parseDateAndTime(assessment.date, assessment.time);
    const countdown = getCountdownParts(assessment.date, assessment.time, now);
    return {
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      courseCode: assessment.courseCode,
      courseName: assessment.courseName,
      date: assessment.date,
      time: assessment.time,
      venue: assessment.venue,
      targetTimestampMs: targetDate.getTime(),
      targetIso: targetDate.toISOString(),
      daysRemaining: countdown.days,
      hoursRemaining: countdown.hours,
      minutesRemaining: countdown.minutes,
      compactCountdown: countdown.compactLabel,
    };
  };

  const upcomingList = pool.slice(0, 3).map(mapEntry);
  const next = pool[0];
  const nextEntry = upcomingList[0];

  return {
    hasExamination: true,
    item: next,
    id: nextEntry.id,
    title: nextEntry.title,
    type: nextEntry.type,
    courseCode: nextEntry.courseCode,
    courseName: nextEntry.courseName,
    venue: nextEntry.venue,
    date: nextEntry.date,
    time: nextEntry.time,
    targetTimestampMs: nextEntry.targetTimestampMs,
    targetIso: nextEntry.targetIso,
    daysRemaining: nextEntry.daysRemaining,
    hoursRemaining: nextEntry.hoursRemaining,
    minutesRemaining: nextEntry.minutesRemaining,
    compactCountdown: nextEntry.compactCountdown,
    upcomingList,
  };
}

function buildLockScreenSummary(
  progress: WidgetDailyProgress,
  nextClass: WidgetNextClass,
  nextExam: WidgetNextExamination
): WidgetLockScreenSummary {
  const nextClassLine =
    nextClass.status === 'none'
      ? 'No upcoming classes'
      : nextClass.status === 'in-progress'
      ? `${nextClass.courseCode} · Now (${nextClass.minutesDelta}m left)`
      : nextClass.status === 'upcoming-today'
      ? `${nextClass.courseCode} · ${formatTime12h(nextClass.startTime!)} · ${nextClass.venue}`
      : `${nextClass.courseCode} · ${nextClass.dayName} ${formatTime12h(nextClass.startTime!)}`;

  const nextExamLine =
    nextExam.hasExamination && nextExam.courseCode
      ? `${nextExam.courseCode} ${nextExam.type} · ${nextExam.compactCountdown}`
      : 'No upcoming exams';

  const taskShort =
    progress.totalCount === 0
      ? '0 tasks'
      : `${progress.fractionLabel} tasks`;

  const inlineSummary =
    nextClass.status !== 'none' && nextClass.courseCode
      ? `${taskShort} · Next: ${nextClass.courseCode} ${formatTime12h(nextClass.startTime!)}`
      : nextExam.hasExamination && nextExam.courseCode
      ? `${taskShort} · Exam: ${nextExam.courseCode} (${nextExam.compactCountdown})`
      : `${taskShort} today`;

  return {
    tasksGauge: {
      completed: progress.completedCount,
      total: progress.totalCount,
      percentage: progress.percentage,
      shortLabel: progress.fractionLabel,
    },
    nextClassLine,
    nextExamLine,
    inlineSummary,
  };
}

function computeStaleAfterMs(nextClass: WidgetNextClass, now: Date): number {
  if (nextClass.status === 'in-progress' && nextClass.endTimestampMs) {
    return Math.max(60_000, Math.min(15 * 60_000, nextClass.endTimestampMs - now.getTime()));
  }
  if (nextClass.status === 'upcoming-today' && nextClass.startTimestampMs) {
    return Math.max(60_000, Math.min(15 * 60_000, nextClass.startTimestampMs - now.getTime()));
  }
  return 15 * 60_000;
}

/**
 * Pure builder producing the complete `NativeWidgetSnapshot` from current academic state.
 */
export function buildNativeWidgetSnapshot(
  state: Pick<AcademicState, 'classes' | 'tasks' | 'assessments'>,
  now: Date = new Date(),
  sequence: number = 1
): NativeWidgetSnapshot {
  const todaysTasks = selectTodaysTasks(state.tasks, now);
  const todaysRemainingTasks = selectTodaysRemainingTasks(state.tasks, now);
  const dailyTaskProgress = selectDailyTaskProgress(state.tasks, now);
  const nextUpcomingClass = selectNextUpcomingClass(state.classes, now);
  const nextExamination = selectNextExamination(state.assessments, now);
  const lockScreenSummary = buildLockScreenSummary(
    dailyTaskProgress,
    nextUpcomingClass,
    nextExamination
  );

  return {
    schemaVersion: WIDGET_SCHEMA_VERSION,
    sequence,
    updatedAtMs: now.getTime(),
    generatedAtIso: now.toISOString(),
    timezone: resolveTimezone(),
    staleAfterMs: computeStaleAfterMs(nextUpcomingClass, now),
    platformNote:
      'Synchronized widget data contract for future Android AppWidget/Glance and iOS WidgetKit extensions (separate native implementation; not simulated in the web UI).',
    todaysTasks,
    todaysRemainingTasks,
    dailyTaskProgress,
    nextUpcomingClass,
    nextExamination,
    lockScreenSummary,
    deepLinks: {
      home: '/?view=home',
      tasks: '/?view=tasks',
      schedule: '/?view=schedule',
      exams: '/?view=exams',
      focus: '/?view=focus',
    },
  };
}

/* ---------------- SYNCHRONIZED WIDGET BRIDGE & PERSISTENCE ---------------- */

let latestSnapshot: NativeWidgetSnapshot | null = null;
let latestFingerprint: string | null = null;
let syncSequence = 0;
const listeners = new Set<WidgetDataListener>();
let broadcastChannel: BroadcastChannel | null = null;
let channelInitialized = false;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channelInitialized) {
    channelInitialized = true;
    try {
      broadcastChannel = new BroadcastChannel(WIDGET_SYNC_CHANNEL);
      broadcastChannel.onmessage = (event: MessageEvent<NativeWidgetSnapshot>) => {
        const incoming = event.data;
        if (!incoming || incoming.schemaVersion !== WIDGET_SCHEMA_VERSION) return;
        if (!latestSnapshot || incoming.updatedAtMs >= latestSnapshot.updatedAtMs) {
          latestSnapshot = incoming;
          syncSequence = Math.max(syncSequence, incoming.sequence);
          for (const listener of listeners) {
            listener(incoming);
          }
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

function createContentFingerprint(snapshot: NativeWidgetSnapshot): string {
  const {
    sequence: _seq,
    updatedAtMs: _updatedAt,
    generatedAtIso: _genIso,
    staleAfterMs: _stale,
    ...stablePayload
  } = snapshot;
  return JSON.stringify(stablePayload);
}

function notifyNativeAndWebConsumers(snapshot: NativeWidgetSnapshot): void {
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // Ignore individual subscriber errors so data layer never breaks callers
    }
  }

  getBroadcastChannel()?.postMessage(snapshot);

  if (typeof window !== 'undefined') {
    const hostWin = window as NativeHostWindow;
    try {
      hostWin.dispatchEvent(new CustomEvent(WIDGET_UPDATE_EVENT, { detail: snapshot }));
    } catch {
      // Ignore environments without CustomEvent constructor support
    }

    try {
      hostWin.AndroidFocusBridge?.onWidgetDataUpdated?.(JSON.stringify(snapshot));
    } catch {
      // Optional future Android WebView bridge
    }

    try {
      hostWin.webkit?.messageHandlers?.focusWidgetData?.postMessage?.(snapshot);
    } catch {
      // Optional future iOS WKWebView bridge
    }
  }
}

/**
 * Rebuilds, persists to IndexedDB (`appMeta['nativeWidgetSnapshot']`), and broadcasts
 * the updated widget snapshot whenever classes, tasks, or assessments change.
 * Skips redundant writes when semantic widget content is unchanged.
 */
export async function syncWidgetDataSnapshot(
  state: Pick<AcademicState, 'classes' | 'tasks' | 'assessments'>,
  now: Date = new Date()
): Promise<NativeWidgetSnapshot> {
  if (syncSequence === 0 && typeof indexedDB !== 'undefined') {
    try {
      const stored = await getMeta<NativeWidgetSnapshot>(WIDGET_INDEXEDDB_META_KEY);
      if (stored && stored.schemaVersion === WIDGET_SCHEMA_VERSION) {
        syncSequence = Math.max(syncSequence, stored.sequence);
        if (!latestSnapshot) {
          latestSnapshot = stored;
          latestFingerprint = createContentFingerprint(stored);
        }
      }
    } catch {
      // Continue cleanly if IndexedDB meta read fails
    }
  }

  const candidate = buildNativeWidgetSnapshot(state, now, syncSequence + 1);
  const candidateFingerprint = createContentFingerprint(candidate);

  if (latestSnapshot && latestFingerprint === candidateFingerprint) {
    return latestSnapshot;
  }

  syncSequence += 1;
  const committed: NativeWidgetSnapshot = {
    ...candidate,
    sequence: syncSequence,
  };

  latestSnapshot = committed;
  latestFingerprint = candidateFingerprint;

  if (typeof indexedDB !== 'undefined') {
    try {
      await setMeta<NativeWidgetSnapshot>(WIDGET_INDEXEDDB_META_KEY, committed);
    } catch {
      // In-memory bridge remains up to date even if IndexedDB is temporarily locked
    }
  }

  notifyNativeAndWebConsumers(committed);
  return committed;
}

/**
 * Returns the latest synchronized widget snapshot stored in IndexedDB.
 */
export async function readPersistedWidgetSnapshot(): Promise<NativeWidgetSnapshot | null> {
  if (latestSnapshot) return latestSnapshot;
  if (typeof indexedDB === 'undefined') return null;
  try {
    const stored = await getMeta<NativeWidgetSnapshot>(WIDGET_INDEXEDDB_META_KEY);
    if (stored && stored.schemaVersion === WIDGET_SCHEMA_VERSION) {
      latestSnapshot = stored;
      latestFingerprint = createContentFingerprint(stored);
      syncSequence = Math.max(syncSequence, stored.sequence);
      return stored;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Public runtime bridge object attached to `window.FocusWidgetBridge`.
 */
export const widgetDataBridge: FocusWidgetBridge = {
  schemaVersion: WIDGET_SCHEMA_VERSION,
  indexedDbStore: 'appMeta',
  indexedDbKey: WIDGET_INDEXEDDB_META_KEY,
  eventName: WIDGET_UPDATE_EVENT,
  channelName: WIDGET_SYNC_CHANNEL,
  getSnapshot: () => latestSnapshot,
  getSnapshotAsync: () => readPersistedWidgetSnapshot(),
  subscribe: (listener: WidgetDataListener) => {
    listeners.add(listener);
    getBroadcastChannel();
    if (latestSnapshot) {
      listener(latestSnapshot);
    }
    return () => {
      listeners.delete(listener);
    };
  },
};

if (typeof window !== 'undefined') {
  (window as NativeHostWindow).FocusWidgetBridge = widgetDataBridge;
}
