import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Database, Download, Layers, Sparkles, Trash2 } from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import {
  WIDGET_INDEXEDDB_META_KEY,
  buildNativeWidgetSnapshot,
} from '../widgets/widgetDataInterface';
import { Modal } from './Modal';

interface DataSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const DataSettingsModal: React.FC<DataSettingsModalProps> = ({ open, onClose }) => {
  const {
    classes,
    tasks,
    notes,
    assessments,
    focusSessions,
    hasSampleData,
    widgetSnapshot: syncedSnapshot,
    loadSampleData,
    removeSampleOnly,
    clearAllData,
  } = useAcademic();

  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [copiedWidgetJson, setCopiedWidgetJson] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmClearAll(false);
    }
  }, [open]);

  const widgetSnapshot = useMemo(
    () =>
      syncedSnapshot ??
      buildNativeWidgetSnapshot({ classes, tasks, assessments }, new Date()),
    [syncedSnapshot, classes, tasks, assessments]
  );

  const handleCopyWidgetSnapshot = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(widgetSnapshot, null, 2));
      setCopiedWidgetJson(true);
      window.setTimeout(() => setCopiedWidgetJson(false), 2000);
    } catch {
      // Clipboard might be restricted in some contexts
    }
  };

  const handleExportBackup = () => {
    const payload = {
      app: 'FOCUS⭐️',
      exportedAt: new Date().toISOString(),
      classes,
      tasks,
      notes,
      assessments,
      focusSessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-star-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Local Storage & Widget Data Layer"
      subtitle="All data persists locally in IndexedDB with zero external servers"
      maxWidthClass="sm:max-w-2xl"
    >
      <div className="space-y-6">
        {/* Local IndexedDB Summary */}
        <section className="rounded-2xl bg-[#F7F6FA] border border-[#E5E3F0] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#141B41] mb-3">
            <Database className="w-4 h-4 text-[#6B5CD1]" />
            <span>IndexedDB Storage Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 tabular-nums">
            <div className="rounded-xl bg-white border border-[#E5E3F0] p-3">
              <div className="text-lg font-bold text-[#141B41]">{classes.length}</div>
              <div className="text-xs text-[#555A7D]">Classes</div>
            </div>
            <div className="rounded-xl bg-white border border-[#E5E3F0] p-3">
              <div className="text-lg font-bold text-[#141B41]">{tasks.length}</div>
              <div className="text-xs text-[#555A7D]">Tasks</div>
            </div>
            <div className="rounded-xl bg-white border border-[#E5E3F0] p-3">
              <div className="text-lg font-bold text-[#141B41]">{notes.length}</div>
              <div className="text-xs text-[#555A7D]">Notes</div>
            </div>
            <div className="rounded-xl bg-white border border-[#E5E3F0] p-3">
              <div className="text-lg font-bold text-[#141B41]">{assessments.length}</div>
              <div className="text-xs text-[#555A7D]">Assessments</div>
            </div>
            <div className="rounded-xl bg-white border border-[#E5E3F0] p-3 col-span-2 sm:col-span-1">
              <div className="text-lg font-bold text-[#141B41]">{focusSessions.length}</div>
              <div className="text-xs text-[#555A7D]">Focus Logs</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {hasSampleData ? (
              <button
                type="button"
                onClick={() => void removeSampleOnly()}
                className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-[#D8D1F5] text-xs font-semibold text-[#141B41] hover:bg-[#EAE6FA] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#B91C1C]" />
                <span>Remove Sample Data (Keep Mine)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void loadSampleData()}
                className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-xl bg-[#EAE6FA] text-xs font-semibold text-[#141B41] hover:bg-[#D8D1F5] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6B5CD1]" />
                <span>Load Optional Demo Semester</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-[#E5E3F0] text-xs font-semibold text-[#141B41] hover:bg-[#F4F2FC] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Backup</span>
            </button>

            {!confirmClearAll ? (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await clearAllData();
                    setConfirmClearAll(false);
                  }}
                  className="min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-semibold hover:bg-[#991B1B] cursor-pointer"
                >
                  Confirm Wipe Everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-[#555A7D] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Native Widget Preparation Layer */}
        <section className="rounded-2xl bg-white border border-[#E5E3F0] p-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#141B41]">
                <Layers className="w-4 h-4 text-[#6B5CD1] shrink-0" />
                <span>Native Widget Data Interface (v{widgetSnapshot.schemaVersion})</span>
              </div>
              <p className="text-xs text-[#555A7D] mt-1">
                Live JSON contract automatically synced to IndexedDB (<span className="font-mono">appMeta.{WIDGET_INDEXEDDB_META_KEY}</span>) and <span className="font-mono">window.FocusWidgetBridge</span> for future Android AppWidget/Glance &amp; iOS WidgetKit wrappers. Native OS widgets require a separate native shell and are not simulated here.
              </p>
              <p className="text-[11px] font-mono text-[#6B5CD1] mt-1.5 tabular-nums">
                Sync #{widgetSnapshot.sequence} · Updated {new Date(widgetSnapshot.updatedAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyWidgetSnapshot()}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl bg-[#EAE6FA] text-xs font-semibold text-[#141B41] hover:bg-[#D8D1F5] transition-colors cursor-pointer shrink-0 self-start"
            >
              {copiedWidgetJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWidgetJson ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <pre className="mt-3 max-h-56 w-full max-w-full overflow-auto rounded-xl bg-[#141B41] text-[#EAE6FA] p-3.5 text-[11px] font-mono leading-relaxed">
            {JSON.stringify(widgetSnapshot, null, 2)}
          </pre>
        </section>
      </div>
    </Modal>
  );
};
