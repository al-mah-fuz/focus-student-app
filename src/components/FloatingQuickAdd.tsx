import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarPlus,
  CheckSquare,
  ClipboardList,
  FileText,
  GraduationCap,
  Plus,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { QuickCreateTarget } from '../types/academic';

interface FloatingQuickAddProps {
  onSelect: (target: QuickCreateTarget) => void;
}

const OPTIONS: Array<{
  target: QuickCreateTarget;
  label: string;
  hint: string;
  icon: React.FC<{ className?: string }>;
  accentClass: string;
}> = [
  {
    target: 'class',
    label: 'Class',
    hint: 'Weekly timetable slot',
    icon: CalendarPlus,
    accentClass: 'bg-[#EAE6FA] text-[#141B41]',
  },
  {
    target: 'task',
    label: 'Task',
    hint: 'To-do with priority',
    icon: CheckSquare,
    accentClass: 'bg-[#EAE6FA] text-[#141B41]',
  },
  {
    target: 'assignment',
    label: 'Assignment',
    hint: 'Coursework deadline',
    icon: ClipboardList,
    accentClass: 'bg-[#FEF3C7] text-[#141B41]',
  },
  {
    target: 'test',
    label: 'Test',
    hint: 'In-term assessment',
    icon: BookOpen,
    accentClass: 'bg-[#EAE6FA] text-[#141B41]',
  },
  {
    target: 'exam',
    label: 'Exam',
    hint: 'Final or major exam',
    icon: GraduationCap,
    accentClass: 'bg-[#141B41] text-[#F5B700]',
  },
  {
    target: 'reminder',
    label: 'Reminder',
    hint: 'Time-sensitive alert',
    icon: Bell,
    accentClass: 'bg-[#FEF3C7] text-[#141B41]',
  },
  {
    target: 'note',
    label: 'Note',
    hint: 'Auto-saved study note',
    icon: FileText,
    accentClass: 'bg-[#EAE6FA] text-[#141B41]',
  },
];

export const FloatingQuickAdd: React.FC<FloatingQuickAddProps> = ({ onSelect }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 bg-[#0C1029]/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed z-40 right-4 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] lg:right-8 lg:bottom-8 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="w-[min(272px,calc(100vw-2rem))] max-h-[62dvh] overflow-y-auto overscroll-contain rounded-2xl bg-white border border-[#E5E3F0] shadow-[0_14px_38px_rgba(20,27,65,0.16)] p-2 origin-bottom-right"
              role="menu"
              aria-label="Quick create menu"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#555A7D]">
                Create new
              </div>
              <div className="space-y-0.5">
                {OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.target}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        onSelect(opt.target);
                      }}
                      className="w-full flex items-center gap-3 min-h-[44px] px-2.5 py-2 rounded-xl text-left hover:bg-[#F4F2FC] active:scale-[0.99] transition-all duration-150 cursor-pointer group"
                    >
                      <span
                        className={`w-8 h-8 rounded-xl ${opt.accentClass} flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#141B41] leading-tight">
                          {opt.label}
                        </span>
                        <span className="block text-[11px] text-[#555A7D] truncate mt-0.5">
                          {opt.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close quick add menu' : 'Quick add item'}
          aria-expanded={open}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(20,27,65,0.22)] transition-all duration-150 active:scale-95 cursor-pointer ${
            open
              ? 'bg-[#141B41] text-white'
              : 'bg-[#F5B700] text-[#141B41] hover:bg-[#FFC71F]'
          }`}
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </motion.span>
        </button>
      </div>
    </>
  );
};
