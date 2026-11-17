import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  Edit2,
  Flag,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { useNow } from '../hooks/useNow';
import type { TaskItem, TaskKind, TaskPriority } from '../types/academic';
import { formatRelativeDateLabel, formatTime12h, toLocalDateKey } from '../utils/dateUtils';

type TaskFilterTab = 'active' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'all';

interface TasksViewProps {
  onAddTask: (kind?: TaskKind) => void;
  onEditTask: (task: TaskItem) => void;
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const TasksView: React.FC<TasksViewProps> = ({ onAddTask, onEditTask }) => {
  const {
    tasks,
    toggleTaskComplete,
    updateTaskPriority,
    deleteTask,
    clearCompletedTasks,
  } = useAcademic();
  const now = useNow(60000);
  const todayKey = toLocalDateKey(now);

  const [filterTab, setFilterTab] = useState<TaskFilterTab>('active');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    let active = 0;
    let today = 0;
    let upcoming = 0;
    let overdue = 0;
    let completed = 0;

    for (const t of tasks) {
      if (t.completed) {
        completed++;
      } else {
        active++;
        if (t.dueDate === todayKey) today++;
        else if (t.dueDate > todayKey) upcoming++;
        else if (t.dueDate < todayKey) overdue++;
      }
    }
    return { active, today, upcoming, overdue, completed, all: tasks.length };
  }, [tasks, todayKey]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filterTab === 'active' && t.completed) return false;
        if (filterTab === 'today' && (t.completed || t.dueDate !== todayKey)) return false;
        if (filterTab === 'upcoming' && (t.completed || t.dueDate <= todayKey)) return false;
        if (filterTab === 'overdue' && (t.completed || t.dueDate >= todayKey)) return false;
        if (filterTab === 'completed' && !t.completed) return false;

        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

        if (q) {
          const hay = `${t.title} ${t.description ?? ''} ${t.courseCode ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      });
  }, [tasks, filterTab, priorityFilter, searchQuery, todayKey]);

  const TABS: Array<{ id: TaskFilterTab; label: string; count: number }> = [
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'today', label: 'Today', count: counts.today },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#5E4EC4] tabular-nums">
            {counts.active} active · {counts.overdue} overdue · {counts.completed} completed
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#141B41] mt-0.5">
            Tasks &amp; Reminders
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {counts.completed > 0 && (
            <button
              type="button"
              onClick={() => void clearCompletedTasks()}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#E6E3F1] text-xs font-semibold text-[#555A7D] hover:text-[#B91C1C] transition-colors cursor-pointer"
            >
              Clear Completed ({counts.completed})
            </button>
          )}
          <button
            type="button"
            onClick={() => onAddTask('task')}
            className="inline-flex items-center gap-2 min-h-[44px] px-4.5 py-2 rounded-xl bg-[#141B41] text-white text-sm font-semibold hover:bg-[#1E2756] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#F5B700]" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter Segmented Bar & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-[#E6E3F1] rounded-2xl overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const active = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 ${
                  active
                    ? 'bg-[#141B41] text-white'
                    : 'text-[#555A7D] hover:bg-[#F4F2FC] hover:text-[#141B41]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    active ? 'text-[#F5B700]' : 'text-[#555A7D]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#555A7D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title, notes, or course code..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white border border-[#E6E3F1] text-base sm:text-sm text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/35"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
            aria-label="Filter by priority"
            className="min-h-[44px] px-3.5 rounded-xl bg-white border border-[#E6E3F1] text-base sm:text-sm font-medium text-[#141B41] focus:outline-none focus:ring-2 focus:ring-[#6B5CD1]/35"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <section className="card-surface rounded-2xl overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#141B41]">No tasks match this view</p>
            <p className="text-xs text-[#555A7D] mt-1">
              {tasks.length === 0
                ? 'Create your first task or reminder to get organized.'
                : 'Try switching filter tabs or clearing your search query.'}
            </p>
            <button
              type="button"
              onClick={() => onAddTask('task')}
              className="mt-4 inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl bg-[#EAE6FA] text-xs font-semibold text-[#141B41] hover:bg-[#D8D1F5] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#ECEAF4]">
            {filteredTasks.map((task) => {
              const isOverdue = !task.completed && task.dueDate < todayKey;
              const relDate = formatRelativeDateLabel(task.dueDate, todayKey);

              return (
                <li
                  key={task.id}
                  className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F6FA]/75 transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => void toggleTaskComplete(task.id)}
                      aria-label={
                        task.completed
                          ? `Mark "${task.title}" active`
                          : `Complete "${task.title}"`
                      }
                      className="min-h-[44px] min-w-[44px] -ml-2 -my-1.5 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-150 ${
                          task.completed
                            ? 'bg-[#141B41] border-[#141B41] text-white'
                            : 'border-[#B9B3DA] bg-white hover:border-[#141B41]'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </span>
                    </button>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.kind === 'reminder' && (
                          <Bell
                            className="w-3.5 h-3.5 text-[#6B5CD1] shrink-0"
                            aria-label="Reminder"
                          />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            task.completed ? 'line-through text-[#6A6E8E]' : 'text-[#141B41]'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#555A7D] mt-0.5 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#555A7D] mt-1.5">
                        {task.courseCode && (
                          <>
                            <span className="font-mono font-semibold text-[#141B41]">
                              {task.courseCode}
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 tabular-nums ${
                            isOverdue ? 'text-[#B91C1C] font-semibold' : ''
                          }`}
                        >
                          {isOverdue && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {isOverdue ? `Overdue (${relDate})` : relDate}
                          {task.dueTime ? ` at ${formatTime12h(task.dueTime)}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{task.kind}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Priority & Edit/Delete Actions */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 shrink-0">
                    <div className="flex items-center gap-1 bg-[#F4F2FC] p-1 rounded-xl">
                      {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => void updateTaskPriority(task.id, p)}
                          title={`Set ${p} priority`}
                          className={`min-h-[38px] sm:min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            task.priority === p
                              ? p === 'high'
                                ? 'bg-[#141B41] text-[#FACC15]'
                                : 'bg-white text-[#141B41] shadow-xs'
                              : 'text-[#555A7D] hover:text-[#141B41]'
                          }`}
                        >
                          {p === 'high' && <Flag className="w-2.5 h-2.5" />}
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        aria-label={`Edit ${task.title}`}
                        className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-xl text-[#555A7D] hover:bg-[#EAE6FA] hover:text-[#141B41] transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteTask(task.id)}
                        aria-label={`Delete ${task.title}`}
                        className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-xl text-[#555A7D] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
