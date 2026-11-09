"use client";

import { useDialog } from "@/hooks/use-dialog";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Check,
  Folder,
  Settings2,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { WorkspaceRecord } from "@/lib/db-repo";

const PRESET_EMOJIS = ["💼", "🚀", "💡", "📁", "🎯", "🏋️", "📚", "🛒", "🎨", "🏠", "🛠️", "💰"];
const PRESET_COLOURS = [
  "#0A84FF", // iOS Blue
  "#30D158", // iOS Green
  "#FF9F0A", // iOS Orange
  "#FF453A", // iOS Red
  "#BF5AF2", // iOS Purple
  "#64D2FF", // iOS Cyan
  "#FF375F", // iOS Pink
  "#FFD60A", // iOS Yellow
];

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onWorkspaceCreated: (workspace: WorkspaceRecord) => void;
  onWorkspaceUpdated: (workspace: WorkspaceRecord) => void;
  onWorkspaceDeleted: (workspaceId: string) => void;
}

export function WorkspaceModal({
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onWorkspaceCreated,
  onWorkspaceUpdated,
  onWorkspaceDeleted,
}: WorkspaceModalProps) {
  const dialogRef = useDialog(isOpen, onClose);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceRecord | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [colour, setColour] = useState(PRESET_COLOURS[0]);
  const [emoji, setEmoji] = useState(PRESET_EMOJIS[0]);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceRecord | null>(null);
  const [reassignToMain, setReassignToMain] = useState(true);

  const resetForm = () => {
    setName("");
    setColour(PRESET_COLOURS[0]);
    setEmoji(PRESET_EMOJIS[0]);
    setSyncToCalendar(true);
    setError(null);
    setView("list");
    setEditingWorkspace(null);
    setDeleteTarget(null);
  };

  const handleStartCreate = () => {
    setName("");
    setColour(PRESET_COLOURS[0]);
    setEmoji(PRESET_EMOJIS[0]);
    setSyncToCalendar(true);
    setError(null);
    setView("create");
  };

  const handleStartEdit = (ws: WorkspaceRecord) => {
    if (ws.isMain) return;
    setEditingWorkspace(ws);
    setName(ws.name);
    setColour(ws.colour);
    setEmoji(ws.emoji);
    setSyncToCalendar(ws.syncToCalendar);
    setError(null);
    setView("edit");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a workspace name");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          colour,
          emoji,
          syncToCalendar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");

      onWorkspaceCreated(data.workspace);
      onSelectWorkspace(data.workspace.id);
      resetForm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating workspace");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace) return;
    setError(null);

    setSubmitting(true);
    try {
      const res = await fetch(`/api/workspaces/${editingWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          colour,
          emoji,
          syncToCalendar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      onWorkspaceUpdated(data.workspace);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating workspace");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${deleteTarget.id}?reassign=${reassignToMain}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        onWorkspaceDeleted(deleteTarget.id);
        if (activeWorkspaceId === deleteTarget.id) {
          onSelectWorkspace("main");
        }
        setDeleteTarget(null);
        resetForm();
      }
    } catch (e) {
      console.error("Failed to delete workspace:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Manage workspaces"
            className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto sheet-surface bg-zinc-950/85 backdrop-blur-3xl border-t border-white/15 rounded-t-[36px] p-5 pb-safe z-50 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[85dvh] overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>
                  {view === "list"
                    ? "Workspaces"
                    : view === "create"
                    ? "New Workspace"
                    : "Edit Workspace"}
                </span>
              </h3>
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* View 1: Workspaces List */}
            {view === "list" && (
              <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-0.5 no-scrollbar">
                {workspaces.map((ws) => {
                  const isSelected =
                    (activeWorkspaceId === "main" && ws.isMain) ||
                    activeWorkspaceId === ws.id;

                  return (
                    <div
                      key={ws.id}
                      onClick={() => {
                        onSelectWorkspace(ws.isMain ? "main" : ws.id);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "glass-panel border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
                          : "glass-card hover:bg-white/10 border-white/10"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border glass-pill"
                          style={{
                            borderColor: `${ws.colour}50`,
                            boxShadow: `0 0 12px ${ws.colour}30`,
                          }}
                        >
                          {ws.emoji}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {ws.name}
                            </span>
                            {ws.isMain && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-semibold rounded-md border border-blue-400/30">
                                Aggregate
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {ws.isMain
                              ? "Shows reminders from all workspaces"
                              : "Strict workspace isolation"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        {!ws.isMain && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(ws);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white glass-pill"
                            title="Edit workspace"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="w-full mt-3 py-3.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 border-dashed rounded-2xl text-xs font-semibold text-accent-blue flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Workspace</span>
                </button>
              </div>
            )}

            {/* View 2 & 3: Create / Edit Workspace Form */}
            {(view === "create" || view === "edit") && (
              <form
                onSubmit={view === "create" ? handleCreate : handleUpdate}
                className="flex-1 overflow-y-auto py-3 space-y-4"
              >
                {error && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Business, Health, Side Project"
                    required
                    maxLength={50}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                {/* Emoji Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                    Select Icon
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEmoji(em)}
                        className={`h-11 rounded-xl text-lg flex items-center justify-center border transition-all ${
                          emoji === em
                            ? "bg-accent-blue/20 border-accent-blue scale-105"
                            : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colour Palette */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                    Select Tag Colour
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {PRESET_COLOURS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setColour(col)}
                        style={{ backgroundColor: col }}
                        className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                          colour === col
                            ? "ring-2 ring-white scale-110"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        {colour === col && (
                          <Check className="w-4 h-4 text-black stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar Sync Toggle */}
                <div className="pt-2">
                  <label className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800 cursor-pointer">
                    <span className="text-xs text-zinc-300">
                      Sync reminders to Apple Calendar feed
                    </span>
                    <input
                      type="checkbox"
                      checked={syncToCalendar}
                      onChange={(e) => setSyncToCalendar(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-accent-blue focus:ring-0"
                    />
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 bg-accent-blue hover:bg-blue-600 active:scale-[0.98] text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <span>
                      {view === "create" ? "Create Workspace" : "Save Workspace"}
                    </span>
                  </button>

                  {view === "edit" && editingWorkspace && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(editingWorkspace)}
                      className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Workspace</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    Back to list
                  </button>
                </div>
              </form>
            )}

            {/* Delete Confirmation Overlay */}
            {deleteTarget && (
              <div className="absolute inset-0 bg-zinc-950 p-6 flex flex-col justify-between z-30">
                <div className="text-center space-y-3 pt-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">
                    Delete &quot;{deleteTarget.name}&quot;?
                  </h4>
                  <p className="text-xs text-zinc-400">
                    What should happen to existing reminders in this workspace?
                  </p>

                  <div className="space-y-2 pt-2 text-left">
                    <label
                      onClick={() => setReassignToMain(true)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer text-xs ${
                        reassignToMain
                          ? "bg-accent-blue/15 border-accent-blue text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <span>Move reminders to &quot;Main&quot; workspace</span>
                      {reassignToMain && <Check className="w-4 h-4 text-accent-blue" />}
                    </label>

                    <label
                      onClick={() => setReassignToMain(false)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer text-xs ${
                        !reassignToMain
                          ? "bg-red-500/15 border-red-500 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <span>Delete all reminders permanently</span>
                      {!reassignToMain && <Check className="w-4 h-4 text-red-400" />}
                    </label>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-semibold rounded-xl text-xs transition-all"
                  >
                    Confirm Deletion
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="w-full py-2.5 bg-zinc-900 text-zinc-400 rounded-xl text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

