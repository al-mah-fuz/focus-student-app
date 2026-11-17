/**
 * Backwards-compatible barrel re-exporting all widget selectors and the canonical
 * native widget data interface from `../widgets/widgetDataInterface`.
 */
export {
  WIDGET_INDEXEDDB_META_KEY,
  WIDGET_SCHEMA_VERSION,
  WIDGET_SYNC_CHANNEL,
  WIDGET_UPDATE_EVENT,
  buildNativeWidgetSnapshot,
  readPersistedWidgetSnapshot,
  selectDailyTaskProgress,
  selectNextExamination,
  selectNextUpcomingClass,
  selectTodaysRemainingTasks,
  selectTodaysTasks,
  syncWidgetDataSnapshot,
  widgetDataBridge,
} from '../widgets/widgetDataInterface';

export type {
  FocusWidgetBridge,
  NativeWidgetSnapshot,
  WidgetDailyProgress,
  WidgetDataListener,
  WidgetDeepLinks,
  WidgetExamEntry,
  WidgetLockScreenSummary,
  WidgetNextClass,
  WidgetNextExamination,
  WidgetRemainingTasks,
  WidgetTaskEntry,
  WidgetTodaysTasks,
} from '../widgets/widgetDataInterface';
