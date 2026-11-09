"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Layers,
  LayoutList,
  Smartphone,
  LogOut,
  User,
  Shield,
  Bell,
  BellRing,
  Calendar,
  RotateCcw,
  Sparkles,
  FolderKanban,
  History,
  Settings,
  ChevronDown,
  CheckCircle2,
  Send,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  WifiOff,
  AlertCircle,
  Radio,
} from "lucide-react";
import { CardStack } from "@/components/card-stack";
import { ReminderListView } from "@/components/reminder-list-view";
import { QuickAddSheet } from "@/components/quick-add-sheet";
import { SnoozeModal } from "@/components/snooze-modal";
import { RescheduleModal } from "@/components/reschedule-modal";
import { ReminderDetailModal } from "@/components/reminder-detail-modal";
import { WorkspaceModal } from "@/components/workspace-modal";
import { HistoryView } from "@/components/history-view";
import { ReminderRecord, WorkspaceRecord } from "@/lib/db-repo";
import { registerServiceWorker, subscribeToPush } from "@/lib/push-client";
import {
  getCachedReminders,
  setCachedReminders,
  getCachedWorkspaces,
  setCachedWorkspaces,
  enqueueOfflineMutation,
  syncPendingMutations,
} from "@/lib/offline-sync";

export default function HomePage() {
  const { data: session } = useSession();
  const [isStandalone, setIsStandalone] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "history" | "settings">(
    "home"
  );
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("main");
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Push notifications state
  const [notificationPermission, setNotificationPermission] =
    useState<string>("default");
  const [enablingPush, setEnablingPush] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Offline status & pending mutations
  const [isOnline, setIsOnline] = useState(true);

  // Calendar Feed state
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState(false);

  // Modals
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState<ReminderRecord | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<ReminderRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<ReminderRecord | null>(null);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    reminder: ReminderRecord;
    timer: NodeJS.Timeout;
  } | null>(null);

  // Stale-while-revalidate: load initial cached data immediately on startup
  useEffect(() => {
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(isRunningStandalone);

    const savedWs = localStorage.getItem("remidify_active_ws");
    if (savedWs) {
      setActiveWorkspaceId(savedWs);
    }

    // Load from cache first for instant opening
    const cachedWs = getCachedWorkspaces();
    if (cachedWs.length > 0) {
      setWorkspaces(cachedWs);
    }
    const cachedRem = getCachedReminders();
    if (cachedRem.length > 0) {
      setReminders(cachedRem);
      setLoading(false);
    }

    // Online / Offline listener
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = async () => {
        setIsOnline(true);
        const synced = await syncPendingMutations();
        if (synced > 0) {
          fetchReminders();
          setPushStatusMessage({
            type: "success",
            text: `Synced ${synced} offline change(s).`,
          });
        }
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Register service worker
      registerServiceWorker();

      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleSelectWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
    localStorage.setItem("remidify_active_ws", id);
  };

  // Fetch workspaces & reminders
  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        const wsList = data.workspaces || [];
        setWorkspaces(wsList);
        setCachedWorkspaces(wsList);
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
        const remList = data.reminders || [];
        setReminders(remList);
        setCachedReminders(remList);
      }
    } catch (e) {
      console.error("Failed to load reminders:", e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  const fetchCalendarToken = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/token");
      if (res.ok) {
        const data = await res.json();
        setCalendarToken(data.calendarToken);
      }
    } catch (e) {
      console.error("Failed to load calendar token:", e);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchWorkspaces();
      fetchReminders();
      fetchCalendarToken();
    }
  }, [session, fetchWorkspaces, fetchReminders, fetchCalendarToken]);

  const handleRegenerateCalendarToken = async () => {
    setRegeneratingToken(true);
    try {
      const res = await fetch("/api/calendar/token", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCalendarToken(data.calendarToken);
        setPushStatusMessage({
          type: "success",
          text: "Calendar feed token regenerated successfully.",
        });
      }
    } catch (e) {
      console.error("Failed to regenerate token:", e);
    } finally {
      setRegeneratingToken(false);
    }
  };

  const handleReminderCreated = (newReminder: ReminderRecord) => {
    setReminders((prev) => {
      const next = [newReminder, ...prev];
      setCachedReminders(next);
      return next;
    });

    if (typeof window !== "undefined" && !navigator.onLine) {
      enqueueOfflineMutation("create", "/api/reminders", newReminder);
      setPushStatusMessage({
        type: "success",
        text: "Saved offline. Will sync when reconnected.",
      });
    }
  };

  // Complete action (Swipe right or Checkbox)
  const handleComplete = async (reminder: ReminderRecord) => {
    setReminders((prev) => {
      const updated = prev.map((r) =>
        r.id === reminder.id
          ? { ...r, status: "done" as const, completedAt: new Date() }
          : r
      );
      setCachedReminders(updated);
      return updated;
    });

    if (undoToast) clearTimeout(undoToast.timer);
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 5000);
    setUndoToast({ reminder, timer });

    if (typeof window !== "undefined" && !navigator.onLine) {
      enqueueOfflineMutation("patch", `/api/reminders/${reminder.id}`, {
        status: "done",
        action: "completed",
      });
      return;
    }

    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done", action: "completed" }),
      });

      if (res.ok) {
        const data = await res.json();
        // If server spawned next occurrence of repeating reminder, add it to state immediately
        if (data.nextOccurrence) {
          setReminders((prev) => {
            const next = [data.nextOccurrence, ...prev];
            setCachedReminders(next);
            return next;
          });
        }
      }
    } catch (e) {
      console.error("Failed to mark done:", e);
      enqueueOfflineMutation("patch", `/api/reminders/${reminder.id}`, {
        status: "done",
        action: "completed",
      });
    }
  };

  // Undo Complete
  const handleUndo = async () => {
    if (!undoToast) return;
    const { reminder, timer } = undoToast;
    clearTimeout(timer);
    setUndoToast(null);

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

  // Snooze Action (Swipe left)
  const handleSnoozed = async (reminderId: string, newDueDate: Date) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId
          ? {
              ...r,
              dueAt: newDueDate,
              snoozedCount: (r.snoozedCount || 0) + 1,
            }
          : r
      )
    );

    try {
      await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueAt: newDueDate.toISOString(),
          action: "snoozed",
        }),
      });
    } catch (e) {
      console.error("Failed to snooze:", e);
    }
  };

  // Reschedule Action (Swipe up)
  const handleRescheduled = async (reminderId: string, newDueDate: Date) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminderId ? { ...r, dueAt: newDueDate } : r
      )
    );

    try {
      await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueAt: newDueDate.toISOString(),
          action: "rescheduled",
        }),
      });
    } catch (e) {
      console.error("Failed to reschedule:", e);
    }
  };

  // Detail updated or deleted
  const handleReminderUpdated = (updated: ReminderRecord) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const handleReminderDeleted = (deletedId: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== deletedId));
  };

  // Workspaces updates
  const handleWorkspaceCreated = (newWs: WorkspaceRecord) => {
    setWorkspaces((prev) => [...prev, newWs]);
  };

  const handleWorkspaceUpdated = (updatedWs: WorkspaceRecord) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === updatedWs.id ? updatedWs : w))
    );
  };

  const handleWorkspaceDeleted = (deletedWsId: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== deletedWsId));
    fetchReminders();
  };

  // Web Push Handlers
  const handleEnablePush = async () => {
    setEnablingPush(true);
    setPushStatusMessage(null);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("VAPID public key not configured in environment");
      }
      const res = await subscribeToPush(vapidKey);
      if (res.success) {
        setNotificationPermission("granted");
        setPushStatusMessage({
          type: "success",
          text: "Web Push notifications enabled successfully!",
        });
      } else {
        setPushStatusMessage({
          type: "error",
          text: res.error || "Permission not granted",
        });
      }
    } catch (e: any) {
      setPushStatusMessage({
        type: "error",
        text: e?.message || "Failed to enable notifications",
      });
    } finally {
      setEnablingPush(false);
    }
  };

  const handleSendTestPush = async () => {
    setTestingPush(true);
    setPushStatusMessage(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPushStatusMessage({
          type: "success",
          text: `Test alert dispatched! (${data.sent} device active)`,
        });
      } else {
        setPushStatusMessage({
          type: "error",
          text: data.error || "Failed to dispatch test notification",
        });
      }
    } catch {
      setPushStatusMessage({
        type: "error",
        text: "Error sending test notification",
      });
    } finally {
      setTestingPush(false);
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
  const activeWsColour =
    activeWorkspaceId === "main" ? "#3b82f6" : activeWs?.colour || "#3b82f6";

  return (
    <div className="flex-1 flex flex-col justify-between h-full pt-safe pb-safe px-4 select-none relative overflow-hidden bg-[#07080c]">
      {/* Dynamic Ambient Aurora Background Blobs */}
      <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-blue-600/18 blur-[90px] pointer-events-none animate-blob-1" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-indigo-600/14 blur-[100px] pointer-events-none animate-blob-2" />
      <div className="absolute -bottom-20 left-10 w-64 h-64 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between py-2 z-10 shrink-0">
        <div className="flex items-center space-x-2">
          {/* Workspace Switcher Pill */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="flex items-center space-x-2 glass-pill px-3.5 py-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer shadow-md"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
              style={{
                backgroundColor: activeWsColour,
                color: activeWsColour,
              }}
            />
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span>{activeWsEmoji}</span>
              <span>{activeWsName}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </motion.button>

          {!isOnline && (
            <span className="glass-pill px-2.5 py-1 rounded-full text-[10px] font-semibold text-amber-300 border-amber-500/30 flex items-center gap-1 animate-pulse">
              <WifiOff className="w-3 h-3 text-amber-400" /> Offline
            </span>
          )}
        </div>

        {/* View Mode Toggle: Cards vs List */}
        <div className="glass-pill p-1 rounded-2xl flex items-center space-x-1">
          <button
            onClick={() => setViewMode("card")}
            className={`p-1.5 rounded-xl transition-all relative ${
              viewMode === "card" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Card Stack View"
          >
            {viewMode === "card" && (
              <motion.div
                layoutId="viewModeIndicator"
                className="absolute inset-0 bg-white/15 rounded-xl border border-white/20 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Layers className="w-4 h-4 relative z-10" />
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-xl transition-all relative ${
              viewMode === "list" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="List View"
          >
            {viewMode === "list" && (
              <motion.div
                layoutId="viewModeIndicator"
                className="absolute inset-0 bg-white/15 rounded-xl border border-white/20 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <LayoutList className="w-4 h-4 relative z-10" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center py-2 relative overflow-hidden z-10">
        {/* iOS PWA Install Guide Banner */}
        {!isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-3 p-3.5 glass-panel rounded-2xl text-xs flex items-center justify-between text-blue-200 shrink-0 border border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.15)]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white text-xs">Install on Home Screen</p>
                <p className="text-[10px] text-zinc-300">
                  Tap Share <span className="text-blue-400 font-bold">⎋</span> then &quot;Add to Home Screen&quot;
                </p>
              </div>
            </div>
            <span className="glass-pill px-2.5 py-1 rounded-full text-[10px] font-semibold text-blue-300 border-blue-400/30">
              iOS PWA
            </span>
          </motion.div>
        )}

        {/* Tab 1: Home View (Card stack or List view) */}
        {activeTab === "home" && (
          <div className="w-full flex-1 flex flex-col items-center justify-center overflow-hidden">
            {viewMode === "list" ? (
              <ReminderListView
                reminders={reminders}
                onToggleDone={(r) =>
                  r.status === "done"
                    ? handleReminderUpdated({ ...r, status: "open" })
                    : handleComplete(r)
                }
                onOpenDetail={(r) => setDetailTarget(r)}
              />
            ) : (
              <CardStack
                reminders={reminders}
                onComplete={handleComplete}
                onSnooze={(r) => setSnoozeTarget(r)}
                onReschedule={(r) => setRescheduleTarget(r)}
                onTap={(r) => setDetailTarget(r)}
              />
            )}
          </div>
        )}

        {/* Tab 2: History Tab */}
        {activeTab === "history" && (
          <HistoryView
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
          />
        )}

        {/* Tab 3: Settings */}
        {activeTab === "settings" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-[360px] glass-panel-elevated rounded-[32px] p-5 space-y-4 overflow-y-auto max-h-[72dvh] no-scrollbar"
          >
            {/* Settings Top Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white tracking-tight">Settings</h3>
              <span className="glass-pill px-2.5 py-1 rounded-full text-[11px] text-emerald-300 flex items-center gap-1.5 border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                365-Day Session
              </span>
            </div>

            {/* Notification / Toast Feedback */}
            <AnimatePresence>
              {pushStatusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 border ${
                    pushStatusMessage.type === "success"
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "bg-red-500/15 border-red-500/30 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  }`}
                >
                  {pushStatusMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-medium">{pushStatusMessage.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {/* Account Card */}
              <div className="p-3.5 glass-card rounded-2xl flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(59,130,246,0.4)] shrink-0 overflow-hidden border border-white/20">
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {(session?.user?.name || session?.user?.email || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                    Signed In As
                  </p>
                  <p className="text-xs font-semibold text-white truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </div>

              {/* iPhone Web Push Section */}
              <div className="p-4 glass-card rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                      <BellRing className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-white">
                      iPhone Web Push
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                      notificationPermission === "granted"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        : "glass-pill text-zinc-400"
                    }`}
                  >
                    {notificationPermission === "granted" ? "⚡ Active" : "Disabled"}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Web Push alerts dispatched within 60s of due time. iOS requires
                  the app to be installed to the Home Screen.
                </p>

                {notificationPermission !== "granted" ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleEnablePush}
                    disabled={enablingPush}
                    className="w-full py-2.5 glow-button-blue text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {enablingPush ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        <span>Enable Push Alerts</span>
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSendTestPush}
                    disabled={testingPush}
                    className="w-full py-2.5 glass-pill hover:bg-white/12 text-zinc-200 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    {testingPush ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-blue-400" />
                        <span>Send Test Notification</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>

              {/* Apple Calendar Integration */}
              <div className="p-4 glass-card rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-white">
                      Apple Calendar Sync
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ICS Feed
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Subscribe in Apple Calendar to view all open reminders with 15-min auto-refresh.
                </p>

                {calendarToken && (
                  <div className="space-y-2">
                    {/* Safari WebCal direct subscription link */}
                    <motion.a
                      whileTap={{ scale: 0.98 }}
                      href={`webcal://${typeof window !== "undefined" ? window.location.host : ""}/api/ics/${calendarToken}.ics`}
                      className="w-full py-2.5 glow-button-emerald text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Subscribe in Apple Calendar</span>
                    </motion.a>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/api/ics/${calendarToken}.ics`;
                          navigator.clipboard.writeText(url);
                          setCopiedFeed(true);
                          setTimeout(() => setCopiedFeed(false), 2000);
                        }}
                        className="flex-1 py-2 glass-pill hover:bg-white/12 active:scale-[0.98] text-zinc-300 rounded-xl text-[11px] font-medium flex items-center justify-center space-x-1.5 transition-all"
                      >
                        <Copy className="w-3 h-3 text-emerald-400" />
                        <span>{copiedFeed ? "Copied Feed Link!" : "Copy Feed URL"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRegenerateCalendarToken}
                        disabled={regeneratingToken}
                        className="py-2 px-3 glass-pill hover:bg-white/12 active:scale-[0.98] text-zinc-400 hover:text-white rounded-xl text-[11px] font-medium flex items-center justify-center transition-all"
                        title="Regenerate secret calendar token"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            regeneratingToken ? "animate-spin text-emerald-400" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="w-full py-3 glass-pill border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* 5-Second Undo Toast */}
        <AnimatePresence>
          {undoToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.92 }}
              className="absolute bottom-4 left-4 right-4 glass-panel-elevated text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between text-xs z-30 border border-white/20"
            >
              <div className="flex items-center space-x-2 truncate pr-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate font-medium">
                  &quot;{undoToast.reminder.title}&quot; marked done
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleUndo}
                className="text-blue-300 font-bold flex items-center gap-1 px-3 py-1.5 glass-pill border-blue-400/40 text-xs rounded-xl shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span>Undo</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Glass Dock (Bottom Navigation Bar) */}
      <nav className="glass-dock mx-2 mb-2 py-2 px-6 rounded-full flex items-center justify-between relative z-20 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        {/* Tab 1: Stack */}
        <button
          onClick={() => setActiveTab("home")}
          className={`relative py-1.5 px-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === "home" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {activeTab === "home" && (
            <motion.div
              layoutId="dockTabIndicator"
              className="absolute inset-0 bg-white/12 rounded-2xl border border-white/15"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />
          )}
          <Layers className="w-5 h-5 relative z-10" />
          <span className="text-[10px] font-semibold mt-0.5 relative z-10">Stack</span>
        </button>

        {/* Center Floating Elevated Glow FAB (+) for Fast Capture */}
        <div className="relative -top-5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsQuickAddOpen(true)}
            className="w-14 h-14 rounded-full glow-fab text-white flex items-center justify-center cursor-pointer border-2 border-white/30"
            aria-label="Add reminder"
          >
            <Plus className="w-7 h-7 stroke-[2.8]" />
          </motion.button>
        </div>

        {/* Tab 2: History */}
        <button
          onClick={() => setActiveTab("history")}
          className={`relative py-1.5 px-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === "history" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {activeTab === "history" && (
            <motion.div
              layoutId="dockTabIndicator"
              className="absolute inset-0 bg-white/12 rounded-2xl border border-white/15"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />
          )}
          <History className="w-5 h-5 relative z-10" />
          <span className="text-[10px] font-semibold mt-0.5 relative z-10">History</span>
        </button>

        {/* Tab 3: Settings */}
        <button
          onClick={() => setActiveTab("settings")}
          className={`relative py-1.5 px-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === "settings" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {activeTab === "settings" && (
            <motion.div
              layoutId="dockTabIndicator"
              className="absolute inset-0 bg-white/12 rounded-2xl border border-white/15"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />
          )}
          <Settings className="w-5 h-5 relative z-10" />
          <span className="text-[10px] font-semibold mt-0.5 relative z-10">Settings</span>
        </button>
      </nav>

      {/* Workspace Switcher & Manager Modal */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={handleSelectWorkspace}
        onWorkspaceCreated={handleWorkspaceCreated}
        onWorkspaceUpdated={handleWorkspaceUpdated}
        onWorkspaceDeleted={handleWorkspaceDeleted}
      />

      {/* Quick Add Bottom Sheet */}
      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onReminderCreated={handleReminderCreated}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />

      {/* Snooze Modal */}
      <SnoozeModal
        isOpen={!!snoozeTarget}
        onClose={() => setSnoozeTarget(null)}
        reminder={snoozeTarget}
        onSnoozed={handleSnoozed}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        reminder={rescheduleTarget}
        onRescheduled={handleRescheduled}
      />

      {/* Detail & Edit Modal */}
      <ReminderDetailModal
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        reminder={detailTarget}
        workspaces={workspaces}
        onUpdated={handleReminderUpdated}
        onDeleted={handleReminderDeleted}
      />
    </div>
  );
}
