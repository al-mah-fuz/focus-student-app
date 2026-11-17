import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Database,
  FileText,
  GraduationCap,
  Home,
  Timer,
} from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { DataSettingsModal } from './components/DataSettingsModal';
import {
  AssessmentFormModal,
  ClassFormModal,
  TaskFormModal,
} from './components/EntityForms';
import { ExamsView } from './components/ExamsView';
import { FloatingQuickAdd } from './components/FloatingQuickAdd';
import { FocusModeModal } from './components/FocusModeModal';
import { HomeView } from './components/HomeView';
import { NotesView } from './components/NotesView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { ScheduleView } from './components/ScheduleView';
import { TasksView } from './components/TasksView';
import { AcademicProvider, useAcademic } from './context/AcademicContext';
import { FocusTimerProvider, useFocusTimer } from './context/FocusTimerContext';
import type {
  ActiveSection,
  AssessmentItem,
  AssessmentType,
  ClassItem,
  DayOfWeek,
  QuickCreateTarget,
  TaskItem,
  TaskKind,
} from './types/academic';

const VALID_SECTIONS = new Set<ActiveSection>(['home', 'schedule', 'tasks', 'notes', 'exams']);

function getInitialDeepLink(): { section: ActiveSection; launchFocus: boolean } {
  if (typeof window === 'undefined') {
    return { section: 'home', launchFocus: false };
  }
  const view = new URLSearchParams(window.location.search).get('view');
  if (view === 'focus') {
    return { section: 'home', launchFocus: true };
  }
  if (view && VALID_SECTIONS.has(view as ActiveSection)) {
    return { section: view as ActiveSection, launchFocus: false };
  }
  return { section: 'home', launchFocus: false };
}

const NAV_ITEMS: Array<{
  id: ActiveSection;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'exams', label: 'Exams', icon: GraduationCap },
];

const AppShell: React.FC = () => {
  const { isLoading, dbError, tasks, assessments } = useAcademic();
  const { openFocusMode, isRunning, remainingSeconds } = useFocusTimer();

  const initialDeepLink = useMemo(() => getInitialDeepLink(), []);
  const [activeSection, setActiveSection] = useState<ActiveSection>(initialDeepLink.section);
  const [noteCreateRequested, setNoteCreateRequested] = useState(false);

  useEffect(() => {
    if (initialDeepLink.launchFocus) {
      openFocusMode();
    }
  }, [initialDeepLink.launchFocus, openFocusMode]);

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [defaultClassDay, setDefaultClassDay] = useState<DayOfWeek | undefined>(undefined);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [defaultTaskKind, setDefaultTaskKind] = useState<TaskKind>('task');

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentItem | null>(null);
  const [defaultAssessmentType, setDefaultAssessmentType] = useState<AssessmentType>('exam');

  const [dataModalOpen, setDataModalOpen] = useState(false);

  const activeTaskCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );
  const pendingExamCount = useMemo(
    () => assessments.filter((a) => !a.completed).length,
    [assessments]
  );

  const openNewClassModal = (day?: DayOfWeek) => {
    setEditingClass(null);
    setDefaultClassDay(day);
    setClassModalOpen(true);
  };

  const openEditClassModal = (cls: ClassItem) => {
    setEditingClass(cls);
    setDefaultClassDay(undefined);
    setClassModalOpen(true);
  };

  const openNewTaskModal = (kind: TaskKind = 'task') => {
    setEditingTask(null);
    setDefaultTaskKind(kind);
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setEditingTask(task);
    setDefaultTaskKind(task.kind);
    setTaskModalOpen(true);
  };

  const openNewAssessmentModal = (type: AssessmentType = 'exam') => {
    setEditingAssessment(null);
    setDefaultAssessmentType(type);
    setAssessmentModalOpen(true);
  };

  const openEditAssessmentModal = (item: AssessmentItem) => {
    setEditingAssessment(item);
    setDefaultAssessmentType(item.type);
    setAssessmentModalOpen(true);
  };

  const handleQuickCreate = (target: QuickCreateTarget) => {
    switch (target) {
      case 'class':
        openNewClassModal();
        break;
      case 'task':
        openNewTaskModal('task');
        break;
      case 'reminder':
        openNewTaskModal('reminder');
        break;
      case 'assignment':
        openNewAssessmentModal('assignment');
        break;
      case 'test':
        openNewAssessmentModal('test');
        break;
      case 'exam':
        openNewAssessmentModal('exam');
        break;
      case 'note':
        setActiveSection('notes');
        setNoteCreateRequested(true);
        break;
    }
  };

  const handleNoteCreateConsumed = useCallback(() => {
    setNoteCreateRequested(false);
  }, []);

  const timerLabel = isRunning
    ? `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
    : 'Focus Mode';

  return (
    <div className="min-h-dvh bg-[#F7F6FA] text-[#141B41] flex flex-col lg:flex-row overflow-x-clip">
      {/* Desktop Sidebar Navigation */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[264px] lg:shrink-0 bg-[#141B41] text-white sticky top-0 h-screen justify-between p-5 border-r border-[#1E2756]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(158, 146, 228, 0.14), transparent 45%)',
        }}
      >
        <div className="space-y-7">
          <div className="px-2 pt-1 flex items-center justify-between">
            <span className="font-display text-xl font-extrabold tracking-tight text-white whitespace-nowrap">
              FOCUS⭐️
            </span>
          </div>

          <nav className="space-y-1" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              const count =
                item.id === 'tasks'
                  ? activeTaskCount
                  : item.id === 'exams'
                  ? pendingExamCount
                  : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`relative w-full flex items-center justify-between gap-3 min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active ? 'text-white' : 'text-[#C8C3E8] hover:text-white hover:bg-white/6'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="desktop-nav-active"
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 rounded-xl bg-[#27326D] border border-white/10"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-[#F5B700]' : 'text-[#A89CF0]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {count > 0 && (
                    <span
                      className={`relative z-10 font-mono text-xs tabular-nums ${
                        active ? 'text-[#F5B700]' : 'text-[#A89CF0]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={openFocusMode}
              className="w-full flex items-center justify-between gap-2 min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#1E2756] hover:bg-[#27326D] border border-white/12 text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <Timer className="w-4 h-4 text-[#F5B700] shrink-0" />
                <span>Focus Timer</span>
              </span>
              <span className="font-mono text-xs tabular-nums text-[#F5B700]">
                {isRunning ? timerLabel : '25m'}
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-white/10">
          <PWAInstallButton darkSurface />
          <button
            type="button"
            onClick={() => setDataModalOpen(true)}
            className="w-full flex items-center gap-2.5 min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium text-[#D8D1F5] hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 text-[#A89CF0] shrink-0" />
            <span>Storage &amp; Widget Data</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Safe-Area Top Strip + Header (pt-safe sits outside fixed height so Dynamic Island / Notch never crushes header content) */}
        <div className="lg:hidden pt-safe bg-white border-b border-[#E5E3F0]">
          <OfflineIndicator />
          <header className="px-4 h-14 flex items-center justify-between gap-2 pl-safe pr-safe">
            <span className="font-display text-lg font-extrabold tracking-tight text-[#141B41] whitespace-nowrap shrink-0">
              FOCUS⭐️
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={openFocusMode}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-[#141B41] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                aria-label="Open Focus Mode timer"
              >
                <Timer className="w-3.5 h-3.5 text-[#F5B700]" />
                <span className={isRunning ? 'font-mono tabular-nums text-[#F5B700]' : ''}>
                  {isRunning ? timerLabel : 'Focus'}
                </span>
              </button>
              <PWAInstallButton compact />
              <button
                type="button"
                onClick={() => setDataModalOpen(true)}
                aria-label="Local storage and widget data"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#F4F2FC] text-[#141B41] hover:bg-[#EAE6FA] transition-colors cursor-pointer"
              >
                <Database className="w-4 h-4" />
              </button>
            </div>
          </header>
        </div>

        {/* Desktop Offline Banner */}
        <div className="hidden lg:block">
          <OfflineIndicator />
        </div>

        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-9 pb-[calc(108px+env(safe-area-inset-bottom,0px))] lg:pb-14">
          {dbError && (
            <div className="mb-6 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-4 text-sm text-[#B91C1C]">
              Local storage error: {dbError}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-5 py-4" aria-busy="true">
              <div className="h-8 w-56 rounded-xl bg-[#EAE6FA]" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 h-48 rounded-2xl bg-[#EAE6FA]" />
                <div className="lg:col-span-5 h-48 rounded-2xl bg-white border border-[#E5E3F0]" />
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeSection === 'home' && (
                  <HomeView
                    onNavigate={setActiveSection}
                    onOpenNewClass={() => openNewClassModal()}
                    onOpenNewTask={() => openNewTaskModal('task')}
                    onEditTask={openEditTaskModal}
                    onEditClass={openEditClassModal}
                    onEditAssessment={openEditAssessmentModal}
                  />
                )}
                {activeSection === 'schedule' && (
                  <ScheduleView
                    onAddClassForDay={(day) => openNewClassModal(day)}
                    onEditClass={openEditClassModal}
                  />
                )}
                {activeSection === 'tasks' && (
                  <TasksView
                    onAddTask={(kind) => openNewTaskModal(kind)}
                    onEditTask={openEditTaskModal}
                  />
                )}
                {activeSection === 'notes' && (
                  <NotesView
                    createRequested={noteCreateRequested}
                    onCreateConsumed={handleNoteCreateConsumed}
                  />
                )}
                {activeSection === 'exams' && (
                  <ExamsView
                    onAddAssessment={(type) => openNewAssessmentModal(type)}
                    onEditAssessment={openEditAssessmentModal}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#E5E3F0] pb-safe pl-safe pr-safe"
      >
        <div className="grid grid-cols-5 h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors cursor-pointer ${
                  active ? 'text-[#141B41]' : 'text-[#555A7D] hover:text-[#141B41]'
                }`}
              >
                <span className="relative px-3.5 py-1 rounded-xl">
                  {active && (
                    <motion.span
                      layoutId="mobile-nav-pill"
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 rounded-xl bg-[#EAE6FA]"
                    />
                  )}
                  <Icon
                    className={`relative z-10 w-5 h-5 ${
                      active ? 'text-[#141B41] stroke-[2.3]' : 'text-[#555A7D]'
                    }`}
                  />
                </span>
                <span className={`text-[11px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <FloatingQuickAdd onSelect={handleQuickCreate} />

      <ClassFormModal
        open={classModalOpen}
        initialClass={editingClass}
        defaultDayOfWeek={defaultClassDay}
        onClose={() => setClassModalOpen(false)}
      />
      <TaskFormModal
        open={taskModalOpen}
        initialTask={editingTask}
        defaultKind={defaultTaskKind}
        onClose={() => setTaskModalOpen(false)}
      />
      <AssessmentFormModal
        open={assessmentModalOpen}
        initialAssessment={editingAssessment}
        defaultType={defaultAssessmentType}
        onClose={() => setAssessmentModalOpen(false)}
      />
      <FocusModeModal />
      <DataSettingsModal open={dataModalOpen} onClose={() => setDataModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AcademicProvider>
        <FocusTimerProvider>
          <AppShell />
        </FocusTimerProvider>
      </AcademicProvider>
    </MotionConfig>
  );
}
