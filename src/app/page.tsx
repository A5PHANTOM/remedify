"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Layers, LayoutList, LogOut, Calendar, Sparkles, FolderKanban, History, Settings, ChevronDown, ChevronRight, CheckCircle2, Copy, ExternalLink, RefreshCw, WifiOff, AlertCircle, X, Check, House, ArrowUpRight, ShieldCheck } from "lucide-react";
import { NotificationSettings } from "@/components/notification-settings";
import { CardStack } from "@/components/card-stack";
import { ReminderListView } from "@/components/reminder-list-view";
import { QuickAddSheet } from "@/components/quick-add-sheet";
import { SnoozeModal } from "@/components/snooze-modal";
import { RescheduleModal } from "@/components/reschedule-modal";
import { ReminderDetailModal } from "@/components/reminder-detail-modal";
import { WorkspaceModal } from "@/components/workspace-modal";
import { HistoryView } from "@/components/history-view";
import { ReminderRecord, WorkspaceRecord } from "@/lib/db-repo";
import { registerServiceWorker } from "@/lib/push-client";
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
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "history" | "settings">(
    "home"
  );
  const [viewMode, setViewMode] = useState<"card" | "list">("list");

  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("main");
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoadError(null);
      const url =
        activeWorkspaceId === "main"
          ? "/api/reminders?status=all"
          : `/api/reminders?workspaceId=${activeWorkspaceId}&status=all`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Please check your connection and try again.");
      if (res.ok) {
        const data = await res.json();
        const remList = data.reminders || [];
        setReminders(remList);
        setCachedReminders(remList);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Please try again.");
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

  const handleToggleDone = async (reminder: ReminderRecord) => {
    if (reminder.status === "open") return handleComplete(reminder);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "open", action: "reopened" }) });
      if (!res.ok) throw new Error("Couldn’t reopen this reminder. Try again.");
      await fetchReminders();
    } catch (error) { setPushStatusMessage({ type: "error", text: error instanceof Error ? error.message : "Couldn’t update this reminder." }); }
  };

  // A notification tap should open the reminder, including from a closed Home Screen app.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("reminderId");
    if (!id || reminders.length === 0) return;
    const reminder = reminders.find((item) => item.id === id);
    if (reminder) {
      setDetailTarget(reminder);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [reminders]);

  const handleLogout = async () => { await signOut({ callbackUrl: "/login" }); };

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const today = new Date();
  const todayKey = today.toDateString();
  const openReminders = reminders.filter((r) => r.status === "open");
  const todayCount = openReminders.filter((r) => new Date(r.dueAt).toDateString() === todayKey).length;
  const completedToday = reminders.filter((r) => r.status === "done" && r.completedAt && new Date(r.completedAt).toDateString() === todayKey).length;
  const overdueCount = openReminders.filter((r) => new Date(r.dueAt) < today).length;
  const filteredReminders = reminders.filter((r) => {
    if (filter === "today") return new Date(r.dueAt).toDateString() === todayKey;
    if (filter === "upcoming") return r.status === "open" && new Date(r.dueAt) > today && new Date(r.dueAt).toDateString() !== todayKey;
    return true;
  });
  const progress = completedToday + todayCount > 0 ? completedToday / (completedToday + todayCount) : 0;
  const firstName = session?.user?.name?.split(" ")[0];
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="wordmark" aria-label="Remidify home"><span className="brand-mark"><Layers size={20} /></span>remidify<span className="brand-dot">.</span></a>
        <button className="avatar-button" onClick={() => setActiveTab("settings")} aria-label="Open account settings">{(firstName || session?.user?.email || "R")[0].toUpperCase()}</button>
      </header>

      <main className="app-content" id="main-content">
        {!isOnline && <div className="inline-notice" role="status"><WifiOff size={16} /> You’re offline. Showing your saved reminders.</div>}
        {pushStatusMessage && <div role="status" className={`inline-notice ${pushStatusMessage.type}`}><span>{pushStatusMessage.text}</span><button onClick={() => setPushStatusMessage(null)} aria-label="Dismiss message"><X size={16} /></button></div>}

        {activeTab === "home" && <>
          <section className="page-intro">
            <p className="eyebrow">{greeting}{firstName ? `, ${firstName}` : ""} <span className="greeting-sun">✳</span></p>
            <div className="title-row"><h1>A little more<br /><span>headspace.</span></h1><span className="date-stamp"><strong>{today.getDate()}</strong>{today.toLocaleDateString("en", { month: "short" }).toUpperCase()}</span></div>
            <p className="intro-description">Your plans, in place. Your mind, at ease.</p>
          </section>

          <section className="daily-overview" aria-label="Your day at a glance">
            <div className="overview-top"><span><span className="live-dot" /> YOUR DAY, AT A GLANCE</span><ArrowUpRight size={17} /></div>
            <div className="overview-body"><div><span className="overview-number">{String(todayCount).padStart(2, "0")}</span><p>{todayCount === 1 ? "reminder for today" : "reminders for today"}</p></div>
              <div className="progress-ring" role="img" aria-label={`${completedToday} completed today`} style={{ "--progress": `${progress * 360}deg` } as React.CSSProperties}><div><Check size={19} /><strong>{completedToday}</strong><small>done</small></div></div>
            </div>
            <div className="overview-footer"><span>{overdueCount > 0 ? <><span className="overdue-dot" />{overdueCount} overdue · a fresh start awaits</> : <><Sparkles size={13} /> One thing at a time. You’ve got this.</>}</span><span>{openReminders.length} open</span></div>
          </section>

          <NotificationSettings compact onOpen={() => setActiveTab("settings")} />

          <section className="reminders-section" aria-labelledby="reminders-heading">
            <div className="reminders-heading"><h2 id="reminders-heading">Your reminders <span>{openReminders.length}</span></h2>
              <button className="workspace-switch" onClick={() => setIsWorkspaceModalOpen(true)} aria-label="Switch workspace"><span>{activeWorkspaceId === "main" ? "All spaces" : activeWs?.name || "Workspace"}</span><ChevronDown size={14} /></button></div>
            <div className="filter-row"><div className="filter-tabs" aria-label="Filter reminders">{(["all", "today", "upcoming"] as const).map((item) => <button key={item} aria-pressed={filter === item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "today" ? "Today" : "Upcoming"}</button>)}</div>
              <div className="view-switch" aria-label="Reminder view"><button aria-label="List view" aria-pressed={viewMode === "list"} className={viewMode === "list" ? "selected" : ""} onClick={() => setViewMode("list")}><LayoutList size={17} /></button><button aria-label="Focus cards" aria-pressed={viewMode === "card"} className={viewMode === "card" ? "selected" : ""} onClick={() => setViewMode("card")}><Layers size={17} /></button></div></div>
            {loading && reminders.length === 0 ? <div className="loading-reminders" role="status" aria-label="Loading reminders"><span /><span /><span /></div> : loadError && reminders.length === 0 ? <div className="empty-state"><AlertCircle size={30} /><h3>Couldn’t load your reminders</h3><p>{loadError}</p><button className="secondary-button" onClick={fetchReminders}><RefreshCw size={16} /> Try again</button></div> : viewMode === "list" ? <ReminderListView reminders={filteredReminders} onToggleDone={handleToggleDone} onOpenDetail={setDetailTarget} onAdd={() => setIsQuickAddOpen(true)} /> : <div className="focus-stack"><CardStack reminders={filteredReminders} onComplete={handleComplete} onSnooze={setSnoozeTarget} onReschedule={setRescheduleTarget} onTap={setDetailTarget} /></div>}
          </section>
          <p className="endnote">Less on your mind. More in your day.</p>
        </>}

        {activeTab === "history" && <><section className="page-intro compact-intro"><p className="eyebrow">A LITTLE PROGRESS, EVERY DAY</p><h1>Your activity<span className="brand-dot">.</span></h1><p className="intro-description">Every small step adds up.</p></section><HistoryView workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} /></>}

        {activeTab === "settings" && <>
          <section className="page-intro compact-intro"><p className="eyebrow">MAKE YOURSELF AT HOME</p><h1>Your space<span className="brand-dot">.</span></h1><p className="intro-description">The little things, just how you like them.</p></section>
          <section className="account-card"><span className="avatar-button">{(firstName || session?.user?.email || "R")[0].toUpperCase()}</span><div><strong>{session?.user?.name || "Your account"}</strong><p>{session?.user?.email}</p></div><ShieldCheck size={20} /></section>
          <NotificationSettings />
          <section className="settings-card"><div className="section-heading"><span className="settings-icon mint"><Calendar size={20} /></span><h2>Apple Calendar</h2></div><p>See your open reminders alongside the rest of your day. Refresh timing is managed by your calendar app.</p>
            {calendarToken ? <><a className="primary-button mint-button" href={`webcal://${typeof window !== "undefined" ? window.location.host : ""}/api/ics/${calendarToken}.ics`}><ExternalLink size={17} /> Connect Apple Calendar</a><div className="calendar-actions"><button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/api/ics/${calendarToken}.ics`); setCopiedFeed(true); setTimeout(() => setCopiedFeed(false), 2000); } catch { setPushStatusMessage({ type: "error", text: "Couldn’t copy the link. Try connecting Calendar directly." }); } }}><Copy size={15} />{copiedFeed ? "Link copied" : "Copy calendar link"}</button><button className="icon-button" aria-label="Regenerate calendar link" onClick={handleRegenerateCalendarToken} disabled={regeneratingToken}><RefreshCw size={16} className={regeneratingToken ? "animate-spin" : ""} /></button></div></> : <p className="inline-notice">Your calendar connection is loading.</p>}
          </section>
          <button className="settings-card workspace-settings" onClick={() => setIsWorkspaceModalOpen(true)}><span className="settings-icon peach"><FolderKanban size={20} /></span><span><strong>Workspaces</strong><small>A home for every part of your life</small></span><ChevronRight size={18} /></button>
          <button className="signout-button" onClick={handleLogout}><LogOut size={17} /> Sign out</button><p className="endnote">Remidify · A little more headspace.</p>
        </>}
      </main>

      <div className="bottom-bar"><nav className="bottom-nav" aria-label="Main navigation">{([{ id: "home", label: "My day", icon: House }, { id: "history", label: "Activity", icon: History }, { id: "settings", label: "Settings", icon: Settings }] as const).map(({ id, label, icon: Icon }) => <button key={id} aria-current={activeTab === id ? "page" : undefined} onClick={() => { setActiveTab(id); document.querySelector(".app-content")?.scrollTo({ top: 0 }); }} className={activeTab === id ? "active" : ""}><Icon size={21} /><span>{label}</span></button>)}</nav><button className="add-button" aria-label="Add reminder" onClick={() => setIsQuickAddOpen(true)}><Plus size={27} /></button></div>
      <AnimatePresence>{undoToast && <motion.div className="undo-toast" role="status" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}><CheckCircle2 size={18} /><span>One less thing on your mind.</span><button onClick={handleUndo}>Undo</button></motion.div>}</AnimatePresence>
      <WorkspaceModal isOpen={isWorkspaceModalOpen} onClose={() => setIsWorkspaceModalOpen(false)} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onSelectWorkspace={handleSelectWorkspace} onWorkspaceCreated={handleWorkspaceCreated} onWorkspaceUpdated={handleWorkspaceUpdated} onWorkspaceDeleted={handleWorkspaceDeleted} />
      <QuickAddSheet isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} onReminderCreated={handleReminderCreated} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
      <SnoozeModal isOpen={!!snoozeTarget} onClose={() => setSnoozeTarget(null)} reminder={snoozeTarget} onSnoozed={handleSnoozed} />
      <RescheduleModal isOpen={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)} reminder={rescheduleTarget} onRescheduled={handleRescheduled} />
      <ReminderDetailModal isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} reminder={detailTarget} workspaces={workspaces} onUpdated={handleReminderUpdated} onDeleted={handleReminderDeleted} />
    </div>
  );
}
