"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  Calendar,
  Trash2,
  Check,
  Save,
  Tag,
  Flag,
  Repeat,
  History,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ReminderRecord, WorkspaceRecord } from "@/lib/db-repo";
import { formatDueTime } from "@/lib/date-utils";

interface ReminderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: ReminderRecord | null;
  workspaces: WorkspaceRecord[];
  onUpdated: (reminder: ReminderRecord) => void;
  onDeleted: (reminderId: string) => void;
}

export function ReminderDetailModal({
  isOpen,
  onClose,
  reminder,
  workspaces,
  onUpdated,
  onDeleted,
}: ReminderDetailModalProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDateStr, setDueDateStr] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [priority, setPriority] = useState(0);
  const [repeatRule, setRepeatRule] = useState<
    "daily" | "weekly" | "monthly" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setNote(reminder.note || "");
      const d = new Date(reminder.dueAt);
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDueDateStr(localIso);
      setWorkspaceId(reminder.workspaceId);
      setPriority(reminder.priority);
      setRepeatRule(reminder.repeatRule);
      setConfirmDelete(false);
    }
  }, [reminder]);

  if (!reminder) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          note: note.trim() || null,
          dueAt: new Date(dueDateStr).toISOString(),
          workspaceId,
          priority,
          repeatRule,
          action: "edited",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdated(data.reminder);
        onClose();
      }
    } catch (e) {
      console.error("Failed to save updates:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted(reminder.id);
        onClose();
      }
    } catch (e) {
      console.error("Failed to delete reminder:", e);
    } finally {
      setDeleting(false);
    }
  };

  const { relativeText, isOverdue } = formatDueTime(reminder.dueAt);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-zinc-950 border-t border-zinc-800 rounded-t-[32px] p-5 pb-safe z-50 shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full mx-auto mb-3 shrink-0" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span>Edit Reminder</span>
                {isOverdue && reminder.status === "open" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                    Overdue
                  </span>
                )}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-0.5"
            >
              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-accent-blue"
                />
              </div>

              {/* Due Date Input */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Due Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={dueDateStr}
                  onChange={(e) => setDueDateStr(e.target.value)}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-accent-blue"
                />
              </div>

              {/* Workspace Selector */}
              {workspaces.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Workspace
                  </label>
                  <select
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-accent-blue"
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.emoji} {ws.name} {ws.isMain ? "(All)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { level: 0, label: "Normal" },
                    { level: 1, label: "Medium" },
                    { level: 2, label: "High" },
                  ].map((item) => (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setPriority(item.level)}
                      className={`py-2 text-xs rounded-xl font-medium border transition-all ${
                        priority === item.level
                          ? "bg-accent-blue/20 border-accent-blue text-accent-blue"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeat Rule */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Repeat Rule
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { rule: null, label: "None" },
                    { rule: "daily", label: "Daily" },
                    { rule: "weekly", label: "Weekly" },
                    { rule: "monthly", label: "Monthly" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setRepeatRule(item.rule as any)}
                      className={`py-2 text-[11px] rounded-xl font-medium border transition-all ${
                        repeatRule === item.rule
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Notes, details, context..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-blue"
                />
              </div>

              {/* Meta stats */}
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/60 text-[11px] text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="text-zinc-300">
                    {new Date(reminder.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {reminder.snoozedCount > 0 && (
                  <div className="flex justify-between">
                    <span>Snoozed:</span>
                    <span className="text-amber-400">
                      {reminder.snoozedCount} time(s)
                    </span>
                  </div>
                )}
              </div>
            </form>

            {/* Actions footer */}
            <div className="pt-3 border-t border-zinc-800 shrink-0 space-y-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full h-11 bg-accent-blue hover:bg-blue-600 active:scale-[0.98] text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  confirmDelete
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {confirmDelete
                    ? "Confirm Delete?"
                    : "Delete Reminder"}
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

