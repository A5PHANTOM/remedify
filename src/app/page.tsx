"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Plus,
  Check,
  Clock,
  Sparkles,
  FolderKanban,
  History,
  Settings,
  Layers,
  LayoutList,
  Smartphone,
  LogOut,
  User,
  Shield,
  Bell,
  Calendar,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { QuickAddSheet } from "@/components/quick-add-sheet";
import { ReminderListView } from "@/components/reminder-list-view";
import { ReminderRecord, WorkspaceRecord } from "@/lib/db-repo";

export default function HomePage() {
  const { data: session } = useSession();
  const [isStandalone, setIsStandalone] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "history" | "settings">("home");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("main");
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{
    reminder: ReminderRecord;
    timer: NodeJS.Timeout;
  } | null>(null);

  // Standalone detection
  useEffect(() => {
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isRunningStandalone);
  }, []);

  // Fetch workspaces & reminders
  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (e) {
      console.error("Failed to load workspaces:", e);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        activeWorkspaceId === "main"
          ? "/api/reminders?status=all"
          : `/api/reminders?workspaceId=${activeWorkspaceId}&status=all`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders || []);
      }
    } catch (e) {
      console.error("Failed to load reminders:", e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (session?.user) {
      fetchWorkspaces();
      fetchReminders();
    }
  }, [session, fetchWorkspaces, fetchReminders]);

  const handleReminderCreated = (newReminder: ReminderRecord) => {
    setReminders((prev) => [newReminder, ...prev]);
  };

  const handleToggleDone = async (reminder: ReminderRecord) => {
    const newStatus = reminder.status === "done" ? "open" : "done";

    // Optimistic update
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminder.id
          ? {
              ...r,
              status: newStatus,
              completedAt: newStatus === "done" ? new Date() : null,
            }
          : r
      )
    );

    // If marked done, show 5-second undo toast
    if (newStatus === "done") {
      if (undoToast) clearTimeout(undoToast.timer);
      const timer = setTimeout(() => {
        setUndoToast(null);
      }, 5000);
      setUndoToast({ reminder, timer });
    }

    try {
      await fetch(`/api/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          action: newStatus === "done" ? "completed" : "reopened",
        }),
      });
    } catch (e) {
      console.error("Failed to update status:", e);
      // Rollback on failure
      setReminders((prev) =>
        prev.map((r) => (r.id === reminder.id ? reminder : r))
      );
    }
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    const { reminder, timer } = undoToast;
    clearTimeout(timer);
    setUndoToast(null);

    // Reopen reminder
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminder.id ? { ...r, status: "open", completedAt: null } : r
      )
    );

    try {
      await fetch(`/api/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open", action: "reopened" }),
      });
    } catch (e) {
      console.error("Failed to undo:", e);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeWsName =
    activeWorkspaceId === "main" ? "Main" : activeWs?.name || "Workspace";
  const activeWsEmoji =
    activeWorkspaceId === "main" ? "📁" : activeWs?.emoji || "📁";

  return (
    <div className="flex-1 flex flex-col justify-between h-full pt-safe pb-safe px-4 select-none relative overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center space-x-2 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
          <span>{activeWsEmoji}</span>
          <span className="text-sm font-semibold tracking-tight">
            {activeWsName}
          </span>
          <span className="text-xs text-zinc-400">
            {activeWorkspaceId === "main" ? "All Reminders" : "Workspace"}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setViewMode(viewMode === "card" ? "list" : "card")}
            className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-zinc-400 hover:text-white transition-colors"
            title={viewMode === "card" ? "Switch to List View" : "Switch to Card View"}
          >
            {viewMode === "card" ? (
              <LayoutList className="w-5 h-5 text-zinc-200" />
            ) : (
              <Layers className="w-5 h-5 text-accent-blue" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center py-3 relative overflow-hidden">
        {/* iOS PWA Install Guide */}
        {!isStandalone && (
          <div className="w-full mb-2 p-3 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 rounded-2xl text-xs flex items-center justify-between text-blue-200 backdrop-blur-md shrink-0">
            <div className="flex items-center space-x-2.5">
              <Smartphone className="w-4 h-4 text-accent-blue shrink-0" />
              <div>
                <p className="font-semibold text-white">Install for iPhone</p>
                <p className="text-[10px] text-zinc-300">
                  Tap Share <span className="text-accent-blue font-bold">⎋</span>{" "}
                  then &quot;Add to Home Screen&quot;
                </p>
              </div>
            </div>
            <span className="bg-accent-blue/20 text-accent-blue font-medium px-2 py-0.5 rounded text-[10px]">
              PWA
            </span>
          </div>
        )}

        {/* Tab 1: Home View (Card stack or List view) */}
        {activeTab === "home" && (
          <div className="w-full flex-1 flex flex-col items-center justify-center overflow-hidden">
            {viewMode === "list" ? (
              <ReminderListView
                reminders={reminders}
                onToggleDone={handleToggleDone}
              />
            ) : (
              <div className="w-full max-w-[350px] aspect-[4/5] bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-green" />

                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Phase 3 Active
                    </span>
                    <span className="text-xs text-zinc-400">
                      Core Capture Ready
                    </span>
                  </div>
                  <Sparkles className="w-5 h-5 text-accent-blue" />
                </div>

                <div className="space-y-3 my-auto">
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                    Fast Quick-Add
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Natural language dates enabled with chrono-node. Tap the +
                    button below to capture reminders in under 5 seconds.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                      ⚡ &lt;150ms Bottom Sheet
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                      📅 Natural Language Date Chips
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                      📋 List &amp; Card Toggle
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    Total:{" "}
                    <strong className="text-white">{reminders.length}</strong>{" "}
                    reminders
                  </span>
                  <button
                    onClick={() => setViewMode("list")}
                    className="text-accent-blue font-semibold hover:underline"
                  >
                    View List →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: History Tab */}
        {activeTab === "history" && (
          <div className="w-full max-w-[350px] bg-[var(--card)] rounded-3xl border border-[var(--border)] p-6 space-y-4">
            <h3 className="text-lg font-bold">Activity Log</h3>
            <p className="text-xs text-zinc-400">
              Audit log tracking all changes with diffs (Phase 7).
            </p>
            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-300">Reminders Created</p>
              <p className="text-[11px]">
                {reminders.length} items logged in database.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Settings */}
        {activeTab === "settings" && (
          <div className="w-full max-w-[350px] bg-[var(--card)] rounded-3xl border border-[var(--border)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-base font-bold">Settings</h3>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> 365-Day Session
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-zinc-900/70 rounded-xl border border-[var(--border)]">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                  Signed In As
                </p>
                <p className="text-sm font-semibold text-white mt-0.5 truncate">
                  {session?.user?.email}
                </p>
              </div>

              <div className="p-3 bg-zinc-900/70 rounded-xl border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Bell className="w-4 h-4 text-accent-blue" /> Notifications
                  </span>
                  <span className="text-[11px] text-zinc-500">Phase 6</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Calendar className="w-4 h-4 text-accent-green" /> Apple
                    Calendar
                  </span>
                  <span className="text-[11px] text-zinc-500">Phase 7</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        {/* 5-Second Undo Toast */}
        {undoToast && (
          <div className="absolute bottom-4 left-4 right-4 bg-zinc-900 border border-zinc-700 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between text-xs z-30 animate-toast">
            <span className="truncate max-w-[200px]">
              &quot;{undoToast.reminder.title}&quot; marked done
            </span>
            <button
              onClick={handleUndo}
              className="text-accent-blue font-bold flex items-center gap-1 px-2.5 py-1 bg-accent-blue/15 rounded-lg active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation & Thumb Action Bar */}
      <nav className="relative pt-2 pb-1 border-t border-[var(--border)] flex items-center justify-around shrink-0">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center touch-target px-3 transition-colors ${
            activeTab === "home" ? "text-accent-blue" : "text-zinc-400"
          }`}
        >
          <FolderKanban className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Stack</span>
        </button>

        {/* Floating Thumb Capture Button */}
        <div className="relative -top-5">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="w-14 h-14 rounded-full bg-accent-blue text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
            aria-label="Add reminder"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center touch-target px-3 transition-colors ${
            activeTab === "history" ? "text-accent-blue" : "text-zinc-400"
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">History</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center touch-target px-3 transition-colors ${
            activeTab === "settings" ? "text-accent-blue" : "text-zinc-400"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Settings</span>
        </button>
      </nav>

      {/* Quick Add Bottom Sheet Modal */}
      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onReminderCreated={handleReminderCreated}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />
    </div>
  );
}
