import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidthClass = 'sm:max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0C1029]/55 backdrop-blur-xs p-0 sm:p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full ${maxWidthClass} max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white border border-[#E5E3F0] shadow-2xl overflow-hidden pb-safe`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#D8D1F5]" />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[#ECEAF4] shrink-0">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold tracking-tight text-[#141B41] truncate">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-[#555A7D] mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] -mr-2 -my-1 flex items-center justify-center rounded-xl text-[#555A7D] hover:bg-[#F4F2FC] hover:text-[#141B41] transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
