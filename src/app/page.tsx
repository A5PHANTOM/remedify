"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
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
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

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
          setPushStatusMessage(`Synced ${synced} offline change(s).`);
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
        setPushStatusMessage("Calendar feed token regenerated.");
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
      setPushStatusMessage("Saved offline. Will sync when reconnected.");
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
        setPushStatusMessage("Web Push notifications enabled successfully!");
      } else {
        setPushStatusMessage(res.error || "Permission not granted");
      }
    } catch (e: any) {
      setPushStatusMessage(e?.message || "Failed to enable notifications");
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
        setPushStatusMessage(`Test notification dispatched! (${data.sent} device)`);
      } else {
        setPushStatusMessage(data.error || "Failed to dispatch test notification");
      }
    } catch {
      setPushStatusMessage("Error sending test notification");
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
    activeWorkspaceId === "main" ? "#0A84FF" : activeWs?.colour || "#0A84FF";

  return (
    <div className="flex-1 flex flex-col justify-between h-full pt-safe pb-safe px-4 select-none relative overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="flex items-center space-x-2 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm hover:border-zinc-700 active:scale-95 transition-all cursor-pointer"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activeWsColour }}
            />
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span>{activeWsEmoji}</span>
              <span>{activeWsName}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {!isOnline && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setViewMode(viewMode === "card" ? "list" : "card")}
            className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-zinc-400 hover:text-white transition-colors"
            title={
              viewMode === "card"
                ? "Switch to List View"
                : "Switch to Card View"
            }
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
      <main className="flex-1 flex flex-col justify-center items-center py-2 relative overflow-hidden">
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
          <div className="w-full max-w-[350px] bg-[var(--card)] rounded-3xl border border-[var(--border)] p-5 space-y-3.5 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-base font-bold">Settings</h3>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> 365-Day Session
              </span>
            </div>

            {pushStatusMessage && (
              <div className="p-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{pushStatusMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Account Card */}
              <div className="p-3 bg-zinc-900/70 rounded-xl border border-[var(--border)]">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                  Signed In As
                </p>
                <p className="text-sm font-semibold text-white mt-0.5 truncate">
                  {session?.user?.email}
                </p>
              </div>

              {/* Push Notifications Section */}
              <div className="p-3 bg-zinc-900/70 rounded-xl border border-[var(--border)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-accent-blue" />
                    <span className="text-xs font-semibold text-white">
                      iPhone Web Push
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      notificationPermission === "granted"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {notificationPermission === "granted" ? "Active" : "Disabled"}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Web Push alerts dispatched within 60s of due time. iOS requires
                  the app to be installed to the Home Screen.
                </p>

                {notificationPermission !== "granted" ? (
                  <button
                    onClick={handleEnablePush}
                    disabled={enablingPush}
                    className="w-full py-2.5 bg-accent-blue hover:bg-blue-600 active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-blue-500/20"
                  >
                    {enablingPush ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        <span>Enable Push Alerts</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleSendTestPush}
                    disabled={testingPush}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-all"
                  >
                    {testingPush ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test Notification</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Apple Calendar Integration */}
              <div className="p-3 bg-zinc-900/70 rounded-xl border border-[var(--border)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent-green" />
                    <span className="text-xs font-semibold text-white">
                      Apple Calendar Sync
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    ICS Feed
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Subscribe in Apple Calendar to view all open reminders with 15-min auto-refresh.
                </p>

                {calendarToken && (
                  <div className="space-y-2">
                    {/* Safari WebCal direct subscription link */}
                    <a
                      href={`webcal://${typeof window !== "undefined" ? window.location.host : ""}/api/ics/${calendarToken}.ics`}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-emerald-600/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Subscribe in Apple Calendar</span>
                    </a>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/api/ics/${calendarToken}.ics`;
                          navigator.clipboard.writeText(url);
                          setCopiedFeed(true);
                          setTimeout(() => setCopiedFeed(false), 2000);
                        }}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-300 rounded-xl text-[11px] font-medium flex items-center justify-center space-x-1 transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedFeed ? "Copied Link!" : "Copy Feed URL"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRegenerateCalendarToken}
                        disabled={regeneratingToken}
                        className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-400 hover:text-zinc-200 rounded-xl text-[11px] font-medium flex items-center justify-center transition-all"
                        title="Regenerate secret calendar token"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            regeneratingToken ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
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
          <div className="absolute bottom-3 left-4 right-4 bg-zinc-900 border border-zinc-700 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between text-xs z-30 animate-toast">
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
