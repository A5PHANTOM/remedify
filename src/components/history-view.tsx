"use client";

import { useEffect, useState } from "react";
import {
  History,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Trash2,
  RotateCcw,
  Edit3,
  PlusCircle,
  Filter,
} from "lucide-react";
import { ActivityLogRecord, WorkspaceRecord } from "@/lib/db-repo";

interface HistoryViewProps {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string;
}

export function HistoryView({
  workspaces,
  activeWorkspaceId,
}: HistoryViewProps) {
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (e) {
        console.error("Failed to load history logs:", e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (selectedActionFilter === "all") return true;
    return log.action === selectedActionFilter;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "created":
        return {
          icon: <PlusCircle className="w-3.5 h-3.5" />,
          label: "Created",
          color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        };
      case "completed":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: "Completed",
          color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        };
      case "snoozed":
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          label: "Snoozed",
          color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        };
      case "rescheduled":
        return {
          icon: <Calendar className="w-3.5 h-3.5" />,
          label: "Rescheduled",
          color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        };
      case "reopened":
        return {
          icon: <RotateCcw className="w-3.5 h-3.5" />,
          label: "Reopened",
          color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        };
      case "deleted":
        return {
          icon: <Trash2 className="w-3.5 h-3.5" />,
          label: "Deleted",
          color: "bg-red-500/15 text-red-400 border-red-500/30",
        };
      default:
        return {
          icon: <Edit3 className="w-3.5 h-3.5" />,
          label: "Edited",
          color: "bg-zinc-800 text-zinc-300 border-zinc-700",
        };
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden px-1 py-2">
      {/* Header & Filter Pills */}
      <div className="pb-3 border-b border-[var(--border)] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-accent-blue" />
            <span>Activity Log</span>
          </h3>
          <span className="text-xs text-zinc-500">{filteredLogs.length} events</span>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: "all", label: "All" },
            { id: "created", label: "Created" },
            { id: "completed", label: "Done" },
            { id: "snoozed", label: "Snoozed" },
            { id: "rescheduled", label: "Rescheduled" },
            { id: "deleted", label: "Deleted" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSelectedActionFilter(chip.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border shrink-0 transition-all ${
                selectedActionFilter === chip.id
                  ? "bg-accent-blue/20 border-accent-blue text-accent-blue"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Loading activity log...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-zinc-500">
            <History className="w-8 h-8 mx-auto text-zinc-700" />
            <p className="text-xs">No activity logged yet.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getActionBadge(log.action);
            const title =
              log.newValue?.title || log.oldValue?.title || "Reminder";
            const dateStr = new Date(log.createdAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={log.id}
                className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-start justify-between space-x-3 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1 ${badge.color}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {dateStr}
                    </span>
                  </div>

                  <p className="font-semibold text-white truncate pt-0.5">
                    {title}
                  </p>

                  {/* Changes detail */}
                  {log.action === "snoozed" && log.newValue?.dueAt && (
                    <p className="text-[11px] text-amber-400/90 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        Snoozed until{" "}
                        {new Date(log.newValue.dueAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </p>
                  )}

                  {log.action === "rescheduled" && log.newValue?.dueAt && (
                    <p className="text-[11px] text-purple-400/90 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Moved to{" "}
                        {new Date(log.newValue.dueAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
