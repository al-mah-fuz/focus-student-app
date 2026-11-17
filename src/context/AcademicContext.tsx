import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  bulkPutInStore,
  clearAllAcademicRecords,
  deleteFromStore,
  getMeta,
  loadFullAcademicState,
  putInStore,
  removeSampleRecords,
  setMeta,
} from '../db/indexedDb';
import { buildOptionalSampleData } from '../db/sampleData';
import type {
  AcademicState,
  AssessmentItem,
  ClassItem,
  FocusSessionItem,
  NoteItem,
  TaskItem,
} from '../types/academic';
import { createId, toLocalDateKey } from '../utils/dateUtils';
import {
  type NativeWidgetSnapshot,
  syncWidgetDataSnapshot,
} from '../widgets/widgetDataInterface';

interface AcademicContextValue extends AcademicState {
  isLoading: boolean;
  dbError: string | null;
  hasSampleData: boolean;
  showFirstRunOffer: boolean;
  widgetSnapshot: NativeWidgetSnapshot | null;
  saveClass: (input: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<ClassItem>;
  deleteClass: (id: string) => Promise<void>;
  saveTask: (
    input: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt' | 'completed'> & {
      id?: string;
      completed?: boolean;
    }
  ) => Promise<TaskItem>;
  toggleTaskComplete: (id: string) => Promise<void>;
  updateTaskPriority: (id: string, priority: TaskItem['priority']) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearCompletedTasks: () => Promise<void>;
  saveNote: (
    input: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<NoteItem>;
  toggleNotePin: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  saveAssessment: (
    input: Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt' | 'completed'> & {
      id?: string;
      completed?: boolean;
    }
  ) => Promise<AssessmentItem>;
  toggleAssessmentComplete: (id: string) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  logFocusSession: (
    mode: FocusSessionItem['mode'],
    durationMinutes: number,
    label?: string
  ) => Promise<FocusSessionItem>;
  loadSampleData: () => Promise<void>;
  removeSampleOnly: () => Promise<void>;
  dismissFirstRunOffer: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const AcademicContext = createContext<AcademicContextValue | null>(null);

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AcademicState>({
    classes: [],
    tasks: [],
    notes: [],
    assessments: [],
    focusSessions: [],
  });
  const stateRef = useRef<AcademicState>(state);
  stateRef.current = state;

  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [firstRunDismissed, setFirstRunDismissed] = useState(true);
  const [widgetSnapshot, setWidgetSnapshot] = useState<NativeWidgetSnapshot | null>(null);

  const reloadFromDb = useCallback(async () => {
    try {
      const [loaded, dismissed] = await Promise.all([
        loadFullAcademicState(),
        getMeta<boolean>('firstRunOfferDismissed'),
      ]);
      stateRef.current = loaded;
      setState(loaded);
      const isCompletelyEmpty =
        loaded.classes.length === 0 &&
        loaded.tasks.length === 0 &&
        loaded.notes.length === 0 &&
        loaded.assessments.length === 0 &&
        loaded.focusSessions.length === 0;
      setFirstRunDismissed(Boolean(dismissed) || !isCompletelyEmpty);
      setDbError(null);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Unable to access local IndexedDB storage.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadFromDb();
  }, [reloadFromDb]);

  // Keep the native widget data layer synchronized with IndexedDB and runtime bridges
  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;
    const runSync = () => {
      void syncWidgetDataSnapshot(
        {
          classes: stateRef.current.classes,
          tasks: stateRef.current.tasks,
          assessments: stateRef.current.assessments,
        },
        new Date()
      ).then((snapshot) => {
        if (!cancelled) {
          setWidgetSnapshot(snapshot);
        }
      });
    };

    runSync();

    const intervalId = window.setInterval(runSync, 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLoading, state.classes, state.tasks, state.assessments]);

  const hasSampleData = useMemo(() => {
    return (
      state.classes.some((c) => c.isSample) ||
      state.tasks.some((t) => t.isSample) ||
      state.notes.some((n) => n.isSample) ||
      state.assessments.some((a) => a.isSample) ||
      state.focusSessions.some((s) => s.isSample)
    );
  }, [state]);

  const showFirstRunOffer = !isLoading && !firstRunDismissed && !hasSampleData;

  const saveClass = useCallback(
    async (input: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const now = Date.now();
      const existing = input.id
        ? stateRef.current.classes.find((c) => c.id === input.id)
        : undefined;
      const record: ClassItem = {
        ...input,
        id: existing?.id ?? input.id ?? createId(),
        isSample: input.isSample ?? false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await putInStore('classes', record);
      setState((prev) => {
        const exists = prev.classes.some((c) => c.id === record.id);
        const next = {
          ...prev,
          classes: exists
            ? prev.classes.map((c) => (c.id === record.id ? record : c))
            : [...prev.classes, record],
        };
        stateRef.current = next;
        return next;
      });
      return record;
    },
    []
  );

  const deleteClass = useCallback(async (id: string) => {
    await deleteFromStore('classes', id);
    setState((prev) => {
      const next = {
        ...prev,
        classes: prev.classes.filter((c) => c.id !== id),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const saveTask = useCallback(
    async (
      input: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt' | 'completed'> & {
        id?: string;
        completed?: boolean;
      }
    ) => {
      const now = Date.now();
      const existing = input.id
        ? stateRef.current.tasks.find((t) => t.id === input.id)
        : undefined;
      const completed = input.completed ?? existing?.completed ?? false;
      const record: TaskItem = {
        ...input,
        id: existing?.id ?? input.id ?? createId(),
        completed,
        completedAt: completed ? existing?.completedAt ?? now : undefined,
        isSample: input.isSample ?? false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await putInStore('tasks', record);
      setState((prev) => {
        const exists = prev.tasks.some((t) => t.id === record.id);
        const next = {
          ...prev,
          tasks: exists
            ? prev.tasks.map((t) => (t.id === record.id ? record : t))
            : [...prev.tasks, record],
        };
        stateRef.current = next;
        return next;
      });
      return record;
    },
    []
  );

  const toggleTaskComplete = useCallback(async (id: string) => {
    const existing = stateRef.current.tasks.find((t) => t.id === id);
    if (!existing) return;
    const now = Date.now();
    const updated: TaskItem = {
      ...existing,
      completed: !existing.completed,
      completedAt: !existing.completed ? now : undefined,
      updatedAt: now,
    };
    await putInStore('tasks', updated);
    setState((prev) => {
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const updateTaskPriority = useCallback(async (id: string, priority: TaskItem['priority']) => {
    const existing = stateRef.current.tasks.find((t) => t.id === id);
    if (!existing) return;
    const updated: TaskItem = {
      ...existing,
      priority,
      updatedAt: Date.now(),
    };
    await putInStore('tasks', updated);
    setState((prev) => {
      const next = {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await deleteFromStore('tasks', id);
    setState((prev) => {
      const next = {
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const clearCompletedTasks = useCallback(async () => {
    const completedIds = stateRef.current.tasks.filter((t) => t.completed).map((t) => t.id);
    await Promise.all(completedIds.map((id) => deleteFromStore('tasks', id)));
    setState((prev) => {
      const next = {
        ...prev,
        tasks: prev.tasks.filter((t) => !t.completed),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const saveNote = useCallback(
    async (input: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const now = Date.now();
      const existing = input.id
        ? stateRef.current.notes.find((n) => n.id === input.id)
        : undefined;
      const record: NoteItem = {
        ...input,
        id: existing?.id ?? input.id ?? createId(),
        isSample: input.isSample ?? false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await putInStore('notes', record);
      setState((prev) => {
        const exists = prev.notes.some((n) => n.id === record.id);
        const next = {
          ...prev,
          notes: exists
            ? prev.notes.map((n) => (n.id === record.id ? record : n))
            : [record, ...prev.notes],
        };
        stateRef.current = next;
        return next;
      });
      return record;
    },
    []
  );

  const toggleNotePin = useCallback(async (id: string) => {
    const existing = stateRef.current.notes.find((n) => n.id === id);
    if (!existing) return;
    const updated: NoteItem = {
      ...existing,
      pinned: !existing.pinned,
      updatedAt: Date.now(),
    };
    await putInStore('notes', updated);
    setState((prev) => {
      const next = {
        ...prev,
        notes: prev.notes.map((n) => (n.id === id ? updated : n)),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await deleteFromStore('notes', id);
    setState((prev) => {
      const next = {
        ...prev,
        notes: prev.notes.filter((n) => n.id !== id),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const saveAssessment = useCallback(
    async (
      input: Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt' | 'completed'> & {
        id?: string;
        completed?: boolean;
      }
    ) => {
      const now = Date.now();
      const existing = input.id
        ? stateRef.current.assessments.find((a) => a.id === input.id)
        : undefined;
      const record: AssessmentItem = {
        ...input,
        id: existing?.id ?? input.id ?? createId(),
        completed: input.completed ?? existing?.completed ?? false,
        isSample: input.isSample ?? false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await putInStore('assessments', record);
      setState((prev) => {
        const exists = prev.assessments.some((a) => a.id === record.id);
        const next = {
          ...prev,
          assessments: exists
            ? prev.assessments.map((a) => (a.id === record.id ? record : a))
            : [...prev.assessments, record],
        };
        stateRef.current = next;
        return next;
      });
      return record;
    },
    []
  );

  const toggleAssessmentComplete = useCallback(async (id: string) => {
    const existing = stateRef.current.assessments.find((a) => a.id === id);
    if (!existing) return;
    const updated: AssessmentItem = {
      ...existing,
      completed: !existing.completed,
      updatedAt: Date.now(),
    };
    await putInStore('assessments', updated);
    setState((prev) => {
      const next = {
        ...prev,
        assessments: prev.assessments.map((a) => (a.id === id ? updated : a)),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const deleteAssessment = useCallback(async (id: string) => {
    await deleteFromStore('assessments', id);
    setState((prev) => {
      const next = {
        ...prev,
        assessments: prev.assessments.filter((a) => a.id !== id),
      };
      stateRef.current = next;
      return next;
    });
  }, []);

  const logFocusSession = useCallback(
    async (mode: FocusSessionItem['mode'], durationMinutes: number, label?: string) => {
      const now = new Date();
      const record: FocusSessionItem = {
        id: createId(),
        mode,
        durationMinutes,
        label: label?.trim() || undefined,
        completedAt: now.getTime(),
        dateKey: toLocalDateKey(now),
      };
      await putInStore('focusSessions', record);
      setState((prev) => {
        const next = {
          ...prev,
          focusSessions: [record, ...prev.focusSessions],
        };
        stateRef.current = next;
        return next;
      });
      return record;
    },
    []
  );

  const loadSampleData = useCallback(async () => {
    const sample = buildOptionalSampleData(new Date());
    await Promise.all([
      bulkPutInStore('classes', sample.classes),
      bulkPutInStore('tasks', sample.tasks),
      bulkPutInStore('notes', sample.notes),
      bulkPutInStore('assessments', sample.assessments),
      bulkPutInStore('focusSessions', sample.focusSessions),
      setMeta('firstRunOfferDismissed', true),
    ]);
    setFirstRunDismissed(true);
    await reloadFromDb();
  }, [reloadFromDb]);

  const removeSampleOnly = useCallback(async () => {
    await removeSampleRecords();
    await setMeta('firstRunOfferDismissed', true);
    setFirstRunDismissed(true);
    await reloadFromDb();
  }, [reloadFromDb]);

  const dismissFirstRunOffer = useCallback(async () => {
    await setMeta('firstRunOfferDismissed', true);
    setFirstRunDismissed(true);
  }, []);

  const clearAllData = useCallback(async () => {
    await clearAllAcademicRecords();
    await setMeta('firstRunOfferDismissed', true);
    setFirstRunDismissed(true);
    const empty: AcademicState = {
      classes: [],
      tasks: [],
      notes: [],
      assessments: [],
      focusSessions: [],
    };
    stateRef.current = empty;
    setState(empty);
  }, []);

  const value = useMemo<AcademicContextValue>(
    () => ({
      ...state,
      isLoading,
      dbError,
      hasSampleData,
      showFirstRunOffer,
      widgetSnapshot,
      saveClass,
      deleteClass,
      saveTask,
      toggleTaskComplete,
      updateTaskPriority,
      deleteTask,
      clearCompletedTasks,
      saveNote,
      toggleNotePin,
      deleteNote,
      saveAssessment,
      toggleAssessmentComplete,
      deleteAssessment,
      logFocusSession,
      loadSampleData,
      removeSampleOnly,
      dismissFirstRunOffer,
      clearAllData,
    }),
    [
      state,
      isLoading,
      dbError,
      hasSampleData,
      showFirstRunOffer,
      widgetSnapshot,
      saveClass,
      deleteClass,
      saveTask,
      toggleTaskComplete,
      updateTaskPriority,
      deleteTask,
      clearCompletedTasks,
      saveNote,
      toggleNotePin,
      deleteNote,
      saveAssessment,
      toggleAssessmentComplete,
      deleteAssessment,
      logFocusSession,
      loadSampleData,
      removeSampleOnly,
      dismissFirstRunOffer,
      clearAllData,
    ]
  );

  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
};

export function useAcademic(): AcademicContextValue {
  const ctx = useContext(AcademicContext);
  if (!ctx) {
    throw new Error('useAcademic must be used inside AcademicProvider');
  }
  return ctx;
}
