# FOCUS⭐️ Native Widget Data Interface

This module defines the synchronized data contract used to power future **native Android (AppWidget / Jetpack Glance)** and **native iOS (WidgetKit)** home-screen and lock-screen widgets.

> **Boundary Note:** The FOCUS⭐️ PWA itself prepares, updates, and persists this data layer inside IndexedDB and runtime JS bridges. It does **not** simulate native OS widgets inside the web UI; native lock-screen and home-screen widgets must be implemented in a separate native mobile wrapper.

---

## 1. Exposed Data Contract (`NativeWidgetSnapshot`, Schema `v2`)

Defined in `./widgetDataInterface.ts`:

- **`todaysTasks`**: All tasks due on the current local date (`totalCount`, `completedCount`, `remainingCount`, and ordered `items[]` with `id`, `title`, `courseCode`, `dueTime`, `priority`, `kind`, `completed`, `completedAt`).
- **`todaysRemainingTasks`**: Incomplete tasks due today (`remainingCount`, `items[]`) for focused checklist widgets.
- **`dailyTaskProgress`**: Completion metrics for today (`completedCount`, `totalCount`, `remainingCount`, `percentage`, `fractionLabel` e.g. `"3/5"`, `isAllComplete`, `statusLabel`).
- **`nextUpcomingClass`**: Current active class or next scheduled class up to 14 days ahead (`status`: `'in-progress' | 'upcoming-today' | 'next-scheduled' | 'none'`, `courseCode`, `courseName`, `venue`, `dayName`, `dateKey`, `startTime`, `endTime`, `startTimestampMs`, `endTimestampMs`, `startIso`, `endIso`, `minutesDelta`, `classItem`).
- **`nextExamination`**: Next upcoming exam (falling back to upcoming test/quiz/practical if no formal exam is scheduled), including `targetTimestampMs`, `targetIso`, `daysRemaining`, `hoursRemaining`, `minutesRemaining`, `compactCountdown`, and `upcomingList` (top 3 upcoming entries).
- **`lockScreenSummary`**: Pre-formatted compact strings for constrained lock-screen slots (`tasksGauge`, `nextClassLine`, `nextExamLine`, `inlineSummary`).
- **`deepLinks`**: Target URLs (`/?view=home`, `/?view=tasks`, `/?view=schedule`, `/?view=exams`, `/?view=focus`) supported directly by `App.tsx`.
- **Freshness metadata**: `schemaVersion`, `sequence`, `updatedAtMs`, `generatedAtIso`, `timezone`, and `staleAfterMs`.

---

## 2. Automatic Synchronization Lifecycle

`AcademicContext` automatically triggers `syncWidgetDataSnapshot(...)`:

1. Immediately after IndexedDB finishes loading on startup.
2. Whenever `classes`, `tasks`, or `assessments` are created, edited, completed/toggled, deleted, cleared, or loaded/removed via sample data.
3. Every 60 seconds and whenever `document.visibilityState` becomes `'visible'` so class status transitions (`upcoming-today` -> `in-progress` -> `next-scheduled`), midnight rollovers, and exam countdowns remain accurate.

Each update:
1. Persists the canonical `NativeWidgetSnapshot` in IndexedDB:
   - Database: `focus_star_db`
   - Object store: `appMeta`
   - Key: `'nativeWidgetSnapshot'`
2. Broadcasts across tabs/workers via `BroadcastChannel('focus_star_widget_sync_v2')`.
3. Dispatches `CustomEvent('focus:widget-data-updated', { detail: snapshot })` on `window`.
4. Invokes optional native wrapper callbacks if registered:
   - **Android WebView / TWA**: `window.AndroidFocusBridge?.onWidgetDataUpdated(JSON.stringify(snapshot))`
   - **iOS WKWebView**: `window.webkit?.messageHandlers?.focusWidgetData?.postMessage(snapshot)`

---

## 3. Native Wrapper Consumption Guide

### Runtime Pull & Subscription (`window.FocusWidgetBridge`)

```ts
// Synchronous read of the latest synced snapshot in memory
const current = window.FocusWidgetBridge?.getSnapshot();

// Asynchronous read (falls back to IndexedDB appMeta['nativeWidgetSnapshot'])
const persisted = await window.FocusWidgetBridge?.getSnapshotAsync();

// Subscribe to live updates whenever the user modifies tasks, classes, or exams
const unsubscribe = window.FocusWidgetBridge?.subscribe((snapshot) => {
  // Forward snapshot JSON to native storage (App Groups / SharedPreferences)
});
```

### iOS WidgetKit (`Swift`)
- Forward `window.webkit.messageHandlers.focusWidgetData` payloads into a shared App Group `UserDefaults` / JSON file, then call `WidgetCenter.shared.reloadAllTimelines()`.
- Use `nextUpcomingClass.startIso` / `endIso` and `nextExamination.targetIso` with SwiftUI `Text(date, style: .relative)` or `Timer` so lock-screen (`accessoryCircular`, `accessoryRectangular`, `accessoryInline`) and home-screen widgets count down natively between timeline refreshes.

### Android AppWidget / Jetpack Glance (`Kotlin`)
- Expose `@JavascriptInterface fun onWidgetDataUpdated(snapshotJson: String)` on `AndroidFocusBridge`, persist the JSON in SharedPreferences / DataStore, and trigger `GlanceAppWidget.updateAll(context)`.
- Use `nextUpcomingClass.startTimestampMs` / `nextExamination.targetTimestampMs` for native countdowns and `deepLinks` (`/?view=...`) on `PendingIntent` tap actions.
