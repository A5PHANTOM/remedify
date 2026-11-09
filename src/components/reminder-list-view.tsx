"use client";

import { ReminderRecord } from "@/lib/db-repo";
import { formatDueTime } from "@/lib/date-utils";
import {
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Calendar,
  Sparkles,
  Repeat,
} from "lucide-react";

interface ReminderListViewProps {
  reminders: ReminderRecord[];
  onToggleDone: (reminder: ReminderRecord) => void;
  onOpenDetail?: (reminder: ReminderRecord) => void;
}

export function ReminderListView({
  reminders,
  onToggleDone,
  onOpenDetail,
}: ReminderListViewProps) {
  if (reminders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <Sparkles className="w-6 h-6 text-accent-blue/60" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-300">No reminders</p>
          <p className="text-xs text-zinc-500 mt-1">
            Tap the + button below to capture a reminder in seconds.
          </p>
        </div>
      </div>
    );
  }

  // Categorize
  const now = new Date();
  const overdueItems: ReminderRecord[] = [];
  const todayItems: ReminderRecord[] = [];
  const upcomingItems: ReminderRecord[] = [];
  const completedItems: ReminderRecord[] = [];

  for (const item of reminders) {
    if (item.status === "done") {
      completedItems.push(item);
      continue;
    }

    const { isOverdue, isToday } = formatDueTime(item.dueAt);
    if (isOverdue) {
      overdueItems.push(item);
    } else if (isToday) {
      todayItems.push(item);
    } else {
      upcomingItems.push(item);
    }
  }

  const renderSection = (
    title: string,
    items: ReminderRecord[],
    badgeColor: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 px-1">
          <span
            className={`w-2 h-2 rounded-full ${badgeColor}`}
          />
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {title} ({items.length})
          </h4>
        </div>

        <div className="space-y-1.5">
          {items.map((reminder) => {
            const { relativeText, isOverdue } = formatDueTime(reminder.dueAt);
            const isDone = reminder.status === "done";

            return (
              <div
                key={reminder.id}
                onClick={() => onOpenDetail?.(reminder)}
                className={`p-3.5 glass-card rounded-2xl flex items-center justify-between space-x-3 transition-all hover:bg-white/10 active:scale-[0.99] cursor-pointer ${
                  isDone ? "opacity-50" : ""
                }`}
              >
                {/* Complete checkbox button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDone(reminder);
                  }}
                  className="touch-target flex items-center justify-center -ml-2 text-zinc-500 hover:text-emerald-400"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-600 hover:text-emerald-400" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium text-[var(--foreground)] truncate ${
                      isDone ? "line-through text-zinc-500" : ""
                    }`}
                  >
                    {reminder.title}
                  </p>

                  <div className="flex items-center flex-wrap gap-2 mt-1 text-[11px]">
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        isOverdue && !isDone
                          ? "text-red-400 font-semibold"
                          : "text-zinc-400"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {relativeText}
                    </span>

                    {reminder.workspace && (
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1"
                        style={{
                          borderColor: `${reminder.workspace.colour}40`,
                          backgroundColor: `${reminder.workspace.colour}15`,
                          color: reminder.workspace.colour,
                        }}
                      >
                        <span>{reminder.workspace.emoji}</span>
                        <span>{reminder.workspace.name}</span>
                      </span>
                    )}

                    {reminder.priority > 0 && (
                      <span className="flex items-center text-amber-400 text-[10px] font-semibold">
                        <Flag className="w-2.5 h-2.5 mr-0.5" />
                        {reminder.priority === 2 ? "High" : "Med"}
                      </span>
                    )}

                    {reminder.repeatRule && (
                      <span className="flex items-center text-zinc-400 text-[10px]">
                        <Repeat className="w-2.5 h-2.5 mr-0.5" />
                        {reminder.repeatRule}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex-1 overflow-y-auto px-1 py-2">
      {renderSection("Overdue", overdueItems, "bg-red-500 animate-pulse")}
      {renderSection("Due Today", todayItems, "bg-accent-blue")}
      {renderSection("Upcoming", upcomingItems, "bg-zinc-500")}
      {renderSection("Completed", completedItems, "bg-emerald-500")}
    </div>
  );
}

