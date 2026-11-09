"use client";

import { useEffect, useState } from "react";
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
  Smartphone,
  LogOut,
  User,
  Shield,
  Bell,
  Calendar,
} from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isStandalone, setIsStandalone] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "history" | "settings">(
    "home"
  );

  useEffect(() => {
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(isRunningStandalone);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex-1 flex flex-col justify-between h-full pt-safe pb-safe px-4 select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-[var(--border)]">
        <div className="flex items-center space-x-2 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse"></span>
          <span className="text-sm font-semibold tracking-tight">Main</span>
          <span className="text-xs text-zinc-400">All Reminders</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-zinc-400 hover:text-white transition-colors"
            title="Toggle Card / List view"
          >
            <Layers className="w-5 h-5 text-zinc-200" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center py-4 relative overflow-y-auto">
        {/* iOS PWA Install Guide */}
        {!isStandalone && (
          <div className="w-full mb-3 p-3.5 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 rounded-2xl text-xs flex items-center justify-between text-blue-200 backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <Smartphone className="w-5 h-5 text-accent-blue shrink-0" />
              <div>
                <p className="font-semibold text-white">Install for iPhone</p>
                <p className="text-[11px] text-zinc-300">
                  Tap Share <span className="text-accent-blue font-bold">⎋</span>{" "}
                  then &quot;Add to Home Screen&quot;
                </p>
              </div>
            </div>
            <span className="bg-accent-blue/20 text-accent-blue font-medium px-2 py-1 rounded-md text-[10px]">
              PWA
            </span>
          </div>
        )}

        {/* Tab 1: Home Card Stack */}
        {activeTab === "home" && (
          <div className="w-full max-w-[350px] aspect-[4/5] bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-green" />

            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Phase 2 Active
                </span>
                <span className="text-xs text-zinc-400">Auth Verified</span>
              </div>
              <Sparkles className="w-5 h-5 text-accent-blue" />
            </div>

            <div className="space-y-3 my-auto">
              <div className="flex items-center space-x-2 text-zinc-300">
                <User className="w-4 h-4 text-accent-blue" />
                <span className="text-xs font-medium">
                  {session?.user?.email || "Signed in"}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                Welcome to Remidify
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                365-day persistent session active. Your &quot;Main&quot;
                workspace has been initialized. Swipe gestures and quick capture
                are queued next.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                  🔐 365-Day Rolling Session
                </span>
                <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                  ✉️ 6-Digit Email OTP
                </span>
                <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                  📁 Auto &quot;Main&quot; Workspace
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3.5 h-3.5" /> Swipe Right: Done
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <Clock className="w-3.5 h-3.5" /> Swipe Left: Snooze
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: History Preview */}
        {activeTab === "history" && (
          <div className="w-full max-w-[350px] bg-[var(--card)] rounded-3xl border border-[var(--border)] p-6 space-y-4">
            <h3 className="text-lg font-bold">Activity History</h3>
            <p className="text-xs text-zinc-400">
              Every action (create, snooze, reschedule, complete) will appear
              here in Phase 7.
            </p>
            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-300">Account Created</p>
              <p className="text-[11px]">
                {session?.user?.email} signed in via 6-digit OTP
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
                <Shield className="w-3 h-3" /> Secure Session
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
                <p className="text-[10px] text-zinc-400 mt-1">
                  Session duration: 365 days rolling
                </p>
              </div>

              <div className="p-3 bg-zinc-900/70 rounded-xl border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Bell className="w-4 h-4 text-accent-blue" /> Notifications
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Configured in Phase 6
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Calendar className="w-4 h-4 text-accent-green" /> Apple
                    Calendar
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Configured in Phase 7
                  </span>
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
      </main>

      {/* Bottom Navigation & Thumb Action Bar */}
      <nav className="relative pt-2 pb-1 border-t border-[var(--border)] flex items-center justify-around">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center touch-target px-3 transition-colors ${
            activeTab === "home" ? "text-accent-blue" : "text-zinc-400"
          }`}
        >
          <FolderKanban className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Stack</span>
        </button>

        <div className="relative -top-5">
          <button
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
    </div>
  );
}
