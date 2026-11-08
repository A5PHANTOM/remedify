"use client";

import { useEffect, useState } from "react";
import { Plus, Check, Clock, Calendar, Sparkles, FolderKanban, History, Settings, Layers, Smartphone } from "lucide-react";

export default function HomePage() {
  const [isStandalone, setIsStandalone] = useState(true); // default to true to avoid flash
  const [activeTab, setActiveTab] = useState<"home" | "history" | "settings">("home");

  useEffect(() => {
    // Detect iOS standalone mode
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isRunningStandalone);
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-between h-full pt-safe pb-safe px-4 select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-[var(--border)]">
        <div className="flex items-center space-x-2 bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse"></span>
          <span className="text-sm font-semibold tracking-tight">Main</span>
          <span className="text-xs text-zinc-400">All Reminders</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-zinc-400 hover:text-white transition-colors"
            title="Toggle Card / List view"
          >
            <Layers className="w-5 h-5 text-zinc-200" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center py-6 relative">
        {/* iOS PWA Install Banner (only appears if opened in browser instead of installed Home Screen) */}
        {!isStandalone && (
          <div className="w-full mb-4 p-3.5 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 rounded-2xl text-xs flex items-center justify-between text-blue-200 backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <Smartphone className="w-5 h-5 text-accent-blue shrink-0" />
              <div>
                <p className="font-semibold text-white">Install for iPhone</p>
                <p className="text-[11px] text-zinc-300">Tap Share <span className="inline-block text-accent-blue">⎋</span> then &quot;Add to Home Screen&quot;</p>
              </div>
            </div>
            <span className="bg-accent-blue/20 text-accent-blue font-medium px-2 py-1 rounded-md text-[10px]">PWA</span>
          </div>
        )}

        {/* Phase 1 Foundation Card Shell */}
        <div className="w-full max-w-[350px] aspect-[4/5] bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-green" />

          {/* Card Top Meta */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                Phase 1 Active
              </span>
              <span className="text-xs text-zinc-400">Foundation Ready</span>
            </div>
            <Sparkles className="w-5 h-5 text-accent-blue" />
          </div>

          {/* Card Body */}
          <div className="space-y-3 my-auto">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Welcome to Remidify
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              iPhone-first swipe reminder engine. Ready with safe-area insets, standalone PWA manifest, and Neon Postgres schema.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                ⚡ 390px Mobile First
              </span>
              <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                📱 Safe Areas
              </span>
              <span className="px-2.5 py-1 bg-zinc-800/80 rounded-lg text-[11px] text-zinc-300 border border-zinc-700/50">
                🗄️ Drizzle + Neon
              </span>
            </div>
          </div>

          {/* Card Actions Preview */}
          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Swipe Right: Done
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5" /> Swipe Left: Snooze
            </span>
          </div>
        </div>
      </main>

      {/* Bottom Navigation & Thumb Action Bar */}
      <nav className="relative pt-2 pb-1 border-t border-[var(--border)] flex items-center justify-around">
        {/* Home Tab */}
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
            className="w-14 h-14 rounded-full bg-accent-blue text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
            aria-label="Add reminder"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* History Tab */}
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center touch-target px-3 transition-colors ${
            activeTab === "history" ? "text-accent-blue" : "text-zinc-400"
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">History</span>
        </button>

        {/* Settings Tab */}
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
