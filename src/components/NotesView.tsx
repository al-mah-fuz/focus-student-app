import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  FileText,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import type { NoteItem } from '../types/academic';

const DEFAULT_CATEGORIES = ['Lecture', 'Summary', 'Formula', 'Reading', 'Personal'];

interface NotesViewProps {
  createRequested?: boolean;
  onCreateConsumed?: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  createRequested = false,
  onCreateConsumed,
}) => {
  const { notes, saveNote, toggleNotePin, deleteNote } = useAcademic();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [mobileShowEditor, setMobileShowEditor] = useState(false);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftCategory, setDraftCategory] = useState('Lecture');
  const [draftCourseCode, setDraftCourseCode] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const autoSaveTimerRef = useRef<number | null>(null);
  const activeNoteRef = useRef<NoteItem | null>(null);
  const pendingDraftRef = useRef<{
    id: string;
    title: string;
    content: string;
    category: string;
    courseCode: string;
    pinned: boolean;
  } | null>(null);
  const saveNoteRef = useRef(saveNote);
  saveNoteRef.current = saveNote;

  const flushPendingSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const pending = pendingDraftRef.current;
    if (!pending) return;
    pendingDraftRef.current = null;
    void saveNoteRef.current({
      id: pending.id,
      title: pending.title.trim() || 'Untitled Note',
      content: pending.content,
      category: pending.category || 'Lecture',
      courseCode: pending.courseCode.trim()
        ? pending.courseCode.trim().toUpperCase()
        : undefined,
      pinned: pending.pinned,
      isSample: false,
    });
  }, []);

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes]);

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const n of notes) {
      if (n.category.trim()) set.add(n.category.trim());
    }
    return ['All', ...Array.from(set)];
  }, [notes]);

  const editorCategories = useMemo(
    () => categories.filter((c) => c !== 'All'),
    [categories]
  );

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedNotes.filter((n) => {
      if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;
      if (q) {
        const hay = `${n.title} ${n.content} ${n.category} ${n.courseCode ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sortedNotes, categoryFilter, searchQuery]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  // Keep selectedNoteId synced when notes are added/removed externally (e.g. Clear All / Remove Sample)
  useEffect(() => {
    if (selectedNoteId && !selectedNote) {
      pendingDraftRef.current = null;
      if (sortedNotes.length > 0) {
        const fallback = sortedNotes[0];
        activeNoteRef.current = fallback;
        setSelectedNoteId(fallback.id);
        setDraftTitle(fallback.title);
        setDraftContent(fallback.content);
        setDraftCategory(fallback.category);
        setDraftCourseCode(fallback.courseCode || '');
      } else {
        activeNoteRef.current = null;
        setSelectedNoteId(null);
        setDraftTitle('');
        setDraftContent('');
        setDraftCategory('Lecture');
        setDraftCourseCode('');
        setMobileShowEditor(false);
      }
      setSaveState('idle');
      return;
    }

    if (!selectedNoteId && sortedNotes.length > 0) {
      const first = sortedNotes[0];
      activeNoteRef.current = first;
      setSelectedNoteId(first.id);
      setDraftTitle(first.title);
      setDraftContent(first.content);
      setDraftCategory(first.category);
      setDraftCourseCode(first.courseCode || '');
      setSaveState('idle');
    } else if (selectedNote && activeNoteRef.current?.id !== selectedNote.id) {
      activeNoteRef.current = selectedNote;
      setDraftTitle(selectedNote.title);
      setDraftContent(selectedNote.content);
      setDraftCategory(selectedNote.category);
      setDraftCourseCode(selectedNote.courseCode || '');
      setSaveState('idle');
    }
  }, [selectedNoteId, selectedNote, sortedNotes]);

  const handleCreateNote = useCallback(async () => {
    flushPendingSave();
    const created = await saveNoteRef.current({
      title: 'Untitled Note',
      content: '',
      category: categoryFilter !== 'All' ? categoryFilter : 'Lecture',
      courseCode: undefined,
      pinned: false,
      isSample: false,
    });
    activeNoteRef.current = created;
    setSelectedNoteId(created.id);
    setDraftTitle(created.title);
    setDraftContent(created.content);
    setDraftCategory(created.category);
    setDraftCourseCode('');
    setSaveState('saved');
    setMobileShowEditor(true);
  }, [categoryFilter, flushPendingSave]);

  // Handle "+ -> Note" triggered from any section in the app
  useEffect(() => {
    if (createRequested) {
      void handleCreateNote().then(() => {
        onCreateConsumed?.();
      });
    }
  }, [createRequested, handleCreateNote, onCreateConsumed]);

  // Flush pending auto-save on unmount, tab switch, or page hide
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };
    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const scheduleAutoSave = (
    nextTitle: string,
    nextContent: string,
    nextCategory: string,
    nextCourseCode: string
  ) => {
    if (!selectedNote) return;
    setSaveState('saving');
    pendingDraftRef.current = {
      id: selectedNote.id,
      title: nextTitle,
      content: nextContent,
      category: nextCategory,
      courseCode: nextCourseCode,
      pinned: selectedNote.pinned,
    };
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(async () => {
      const pending = pendingDraftRef.current;
      if (!pending) return;
      pendingDraftRef.current = null;
      await saveNoteRef.current({
        id: pending.id,
        title: pending.title.trim() || 'Untitled Note',
        content: pending.content,
        category: pending.category || 'Lecture',
        courseCode: pending.courseCode.trim()
          ? pending.courseCode.trim().toUpperCase()
          : undefined,
        pinned: pending.pinned,
        isSample: false,
      });
      setSaveState('saved');
      autoSaveTimerRef.current = null;
    }, 350);
  };

  const handleSelectNote = (note: NoteItem) => {
    flushPendingSave();
    activeNoteRef.current = note;
    setSelectedNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftCategory(note.category);
    setDraftCourseCode(note.courseCode || '');
    setSaveState('idle');
    setMobileShowEditor(true);
  };

  const handleDeleteNote = async (id: string) => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (pendingDraftRef.current?.id === id) {
      pendingDraftRef.current = null;
    }
    await deleteNote(id);
    if (selectedNoteId === id) {
      const remaining = sortedNotes.filter((n) => n.id !== id);
      if (remaining.length > 0) {
        const next = remaining[0];
        activeNoteRef.current = next;
        setSelectedNoteId(next.id);
        setDraftTitle(next.title);
        setDraftContent(next.content);
        setDraftCategory(next.category);
        setDraftCourseCode(next.courseCode || '');
      } else {
        activeNoteRef.current = null;
        setSelectedNoteId(null);
        setDraftTitle('');
        setDraftContent('');
        setDraftCategory('Lecture');
        setDraftCourseCode('');
      }
      setMobileShowEditor(false);
    }
  };

  const wordCount = useMemo(() => {
    const trimmed = draftContent.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [draftContent]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#5E4EC4] tabular-nums">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} · Auto-saved locally
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#141B41] mt-0.5">
            Study Notes
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateNote()}
          className="inline-flex items-center gap-2 min-h-[44px] px-4.5 py-2 rounded-xl bg-[#141B41] text-white text-sm font-semibold hover:bg-[#1E2756] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4 text-[#F5B700]" />
          <span>New Note</span>
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-[#E6E3F1] rounded-2xl overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#141B41] text-white'
                  : 'text-[#555A7D] hover:bg-[#F4F2FC] hover:text-[#141B41]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Master-Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[560px]">
        {/* Notes Sidebar List */}
        <aside
          className={`lg:col-span-4 card-surface rounded-2xl p-3.5 flex flex-col ${
            mobileShowEditor ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-[#555A7D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-[#F7F6FA] border border-[#E6E3F1] text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/35 focus:bg-white"
            />
          </div>

          {filteredNotes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <FileText className="w-7 h-7 text-[#6B5CD1] mb-2" />
              <p className="text-sm font-semibold text-[#141B41]">No notes found</p>
              <p className="text-xs text-[#555A7D] mt-1">
                Create a note to capture lecture summaries, formulas, or reading takeaways.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#ECEAF4] overflow-y-auto max-h-[540px]">
              {filteredNotes.map((note) => {
                const isSelected = note.id === selectedNoteId;
                return (
                  <li key={note.id} className="py-0.5">
                    <button
                      type="button"
                      onClick={() => handleSelectNote(note)}
                      className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#EAE6FA] text-[#141B41]'
                          : 'hover:bg-[#F7F6FA]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-[#141B41] truncate">
                          {note.title || 'Untitled Note'}
                        </span>
                        {note.pinned && (
                          <Pin className="w-3.5 h-3.5 text-[#F5B700] fill-[#F5B700] shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-xs text-[#555A7D] line-clamp-2 mt-1 leading-relaxed">
                        {note.content || 'Empty note'}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#555A7D] mt-1.5">
                        <span className="font-medium">{note.category}</span>
                        {note.courseCode && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-[#141B41]">
                              {note.courseCode}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Note Editor */}
        <section
          className={`lg:col-span-8 card-surface rounded-2xl p-5 sm:p-6 flex flex-col ${
            mobileShowEditor ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {selectedNote ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#ECEAF4]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      flushPendingSave();
                      setMobileShowEditor(false);
                    }}
                    className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#F4F2FC] text-[#141B41] cursor-pointer"
                    aria-label="Back to notes list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <select
                    value={draftCategory}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftCategory(v);
                      scheduleAutoSave(draftTitle, draftContent, v, draftCourseCode);
                    }}
                    aria-label="Note category"
                    className="min-h-[44px] sm:min-h-[40px] px-3 rounded-xl bg-[#F7F6FA] border border-[#E6E3F1] text-base sm:text-xs font-semibold text-[#141B41]"
                  >
                    {editorCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={draftCourseCode}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftCourseCode(v);
                      scheduleAutoSave(draftTitle, draftContent, draftCategory, v);
                    }}
                    placeholder="Course (e.g. CSC 301)"
                    className="w-36 min-h-[44px] sm:min-h-[40px] px-3 rounded-xl bg-[#F7F6FA] border border-[#E6E3F1] text-base sm:text-xs font-mono text-[#141B41]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#555A7D] inline-flex items-center gap-1 mr-1">
                    {saveState === 'saving' && 'Saving...'}
                    {saveState === 'saved' && (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#15803D]" />
                        <span>Saved</span>
                      </>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      flushPendingSave();
                      void toggleNotePin(selectedNote.id);
                    }}
                    aria-label={selectedNote.pinned ? 'Unpin note' : 'Pin note'}
                    className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      selectedNote.pinned
                        ? 'bg-[#FEF3C7] text-[#141B41]'
                        : 'bg-[#F4F2FC] text-[#555A7D] hover:text-[#141B41]'
                    }`}
                  >
                    <Pin
                      className={`w-3.5 h-3.5 ${
                        selectedNote.pinned ? 'fill-[#F5B700] text-[#F5B700]' : ''
                      }`}
                    />
                    <span>{selectedNote.pinned ? 'Pinned' : 'Pin'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteNote(selectedNote.id)}
                    aria-label="Delete note"
                    className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-xl text-[#555A7D] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={draftTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraftTitle(v);
                  scheduleAutoSave(v, draftContent, draftCategory, draftCourseCode);
                }}
                placeholder="Note title"
                className="font-display text-2xl font-bold tracking-[-0.015em] text-[#141B41] placeholder:text-[#9CA3AF] focus:outline-none mb-3"
              />

              <textarea
                value={draftContent}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraftContent(v);
                  scheduleAutoSave(draftTitle, v, draftCategory, draftCourseCode);
                }}
                placeholder="Write lecture notes, key formulas, definitions, or exam revision points... (automatically saved)"
                className="flex-1 min-h-[240px] sm:min-h-[340px] w-full resize-none text-base sm:text-[15px] leading-[1.68] text-[#24294A] placeholder:text-[#9CA3AF] focus:outline-none"
              />

              <div className="pt-3 mt-3 border-t border-[#ECEAF4] flex items-center justify-between text-xs text-[#555A7D] tabular-nums">
                <span>
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>
                <span>
                  Updated{' '}
                  {new Date(selectedNote.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FileText className="w-10 h-10 text-[#6B5CD1] mb-3" />
              <h2 className="font-display text-lg font-bold text-[#141B41]">
                Select or create a note
              </h2>
              <p className="text-sm text-[#555A7D] mt-1 max-w-sm">
                Everything you type is automatically saved to IndexedDB for offline revision.
              </p>
              <button
                type="button"
                onClick={() => void handleCreateNote()}
                className="mt-4 inline-flex items-center gap-2 min-h-[44px] px-4.5 py-2 rounded-xl bg-[#141B41] text-white text-sm font-semibold hover:bg-[#1E2756] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#F5B700]" />
                <span>Create First Note</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
