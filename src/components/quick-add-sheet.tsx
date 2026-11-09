"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertCircle,
  Plus,
  Check,
  Flag,
  Repeat,
  Loader2,
} from "lucide-react";
import {
  parseNaturalLanguageDate,
  getQuickDatePresets,
  formatDueTime,
  QuickDatePreset,
} from "@/lib/date-utils";
import { WorkspaceRecord, ReminderRecord } from "@/lib/db-repo";

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onReminderCreated: (reminder: ReminderRecord) => void;
  workspaces: WorkspaceRecord[];
  activeWorkspaceId?: string;
}

export function QuickAddSheet({
  isOpen,
  onClose,
  onReminderCreated,
  workspaces,
  activeWorkspaceId,
}: QuickAddSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [selectedDueDate, setSelectedDueDate] = useState<Date>(() => {
    return new Date(Date.now() + 60 * 60 * 1000); // Default: In 1 hr
  });
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [priority, setPriority] = useState<number>(0);
  const [repeatRule, setRepeatRule] = useState<
    "daily" | "weekly" | "monthly" | null
  >(null);
  const [showMore, setShowMore] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [keepOpenAfterSave, setKeepOpenAfterSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync active workspace
  useEffect(() => {
    if (activeWorkspaceId && activeWorkspaceId !== "main") {
      setSelectedWorkspaceId(activeWorkspaceId);
    } else if (workspaces.length > 0) {
      const mainWs = workspaces.find((w) => w.isMain) || workspaces[0];
      setSelectedWorkspaceId(mainWs.id);
    }
  }, [activeWorkspaceId, workspaces]);

  // Autofocus input when sheet opens (<150ms)
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setShowMore(false);
      setShowCustomPicker(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Real-time title parsing with chrono-node
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);

    if (val.trim().length > 3) {
      const parsed = parseNaturalLanguageDate(val);
      if (parsed.date) {
        setSelectedDueDate(parsed.date);
      }
    }
  };

  const handleApplyPreset = (preset: QuickDatePreset) => {
    setSelectedDueDate(preset.getDate());
    setShowCustomPicker(false);
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedDueDate(new Date(e.target.value));
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Please enter a reminder title");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          note: note.trim() || null,
          dueAt: selectedDueDate.toISOString(),
          workspaceId: selectedWorkspaceId || undefined,
          priority,
          repeatRule,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save reminder");
      }

      onReminderCreated(data.reminder);

      if (keepOpenAfterSave) {
        // Reset inputs for rapid sequential capture
        setTitle("");
        setNote("");
        setSelectedDueDate(new Date(Date.now() + 60 * 60 * 1000));
        inputRef.current?.focus();
      } else {
        setTitle("");
        setNote("");
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const presets = getQuickDatePresets();
  const sameDayPresets = presets.filter((p) => p.category === "sameday");
  const futurePresets = presets.filter((p) => p.category === "future");
  const { relativeText } = formatDueTime(selectedDueDate);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Frosted Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
          />

          {/* Frosted Glass Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-zinc-950/85 backdrop-blur-3xl border-t border-white/15 rounded-t-[36px] p-5 pb-safe z-50 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[85dvh] overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" /> Fast Capture
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              onSubmit={handleSave}
              className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-0.5 no-scrollbar"
            >
              {error && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center space-x-2 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title Input with Glass Aesthetics */}
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  placeholder="e.g. Call vendor tomorrow 5pm"
                  className="w-full glass-card border border-white/12 rounded-2xl px-4 py-3.5 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                  autoComplete="off"
                />
              </div>

              {/* Selected Due Date Pill */}
              <div className="flex items-center justify-between glass-pill px-4 py-2.5 rounded-2xl">
                <div className="flex items-center space-x-2 text-xs">
                  <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-zinc-400">Scheduled:</span>
                  <span className="font-semibold text-blue-300">
                    {relativeText}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(!showCustomPicker)}
                  className="text-[11px] text-zinc-300 hover:text-white underline decoration-zinc-500"
                >
                  {showCustomPicker ? "Hide Picker" : "Custom"}
                </button>
              </div>

              {/* Native Date Picker (if toggled) */}
              {showCustomPicker && (
                <div className="p-3.5 glass-card rounded-2xl border border-white/10 space-y-1">
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Select exact date and time:
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      new Date(
                        selectedDueDate.getTime() -
                          selectedDueDate.getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 16)
                    }
                    onChange={handleCustomDateChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              )}

              {/* Preset Chips */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Quick Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sameDayPresets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-3 py-1.5 glass-pill hover:bg-white/12 active:scale-95 text-xs text-zinc-200 rounded-xl transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                  {futurePresets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-3 py-1.5 glass-pill hover:bg-white/12 active:scale-95 text-xs text-zinc-200 rounded-xl transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* More Toggle */}
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="w-full py-2 flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 border-t border-white/10 pt-2.5"
              >
                <span className="font-medium">
                  {showMore ? "Fewer options" : "More (workspace, priority, note, repeat)"}
                </span>
                {showMore ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Expanded "More" Options */}
              {showMore && (
                <div className="space-y-3 pt-1 border-t border-white/5">
                  {/* Workspace selector */}
                  {workspaces.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Workspace
                      </label>
                      <select
                        value={selectedWorkspaceId}
                        onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                        className="w-full glass-card border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-400"
                      >
                        {workspaces.map((ws) => (
                          <option key={ws.id} value={ws.id} className="bg-zinc-900 text-white">
                            {ws.emoji} {ws.name} {ws.isMain ? "(All)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Priority selector */}
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
                              ? "bg-blue-500/25 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                              : "glass-pill text-zinc-400 hover:text-white"
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
                          onClick={() =>
                            setRepeatRule(item.rule as any)
                          }
                          className={`py-2 text-[11px] rounded-xl font-medium border transition-all ${
                            repeatRule === item.rule
                              ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                              : "glass-pill text-zinc-400 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Note */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Note (optional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add details, link, or context..."
                      rows={2}
                      className="w-full glass-card border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Bottom Actions Area */}
            <div className="pt-3 border-t border-white/10 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs px-1">
                <label className="flex items-center space-x-2 text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepOpenAfterSave}
                    onChange={(e) => setKeepOpenAfterSave(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-blue-500 focus:ring-0"
                  />
                  <span>Save and add another</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="w-full h-12 glow-button-blue active:scale-[0.98] text-white font-semibold rounded-2xl text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    <span>Save Reminder</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
