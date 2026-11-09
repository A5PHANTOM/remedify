"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, X, Calendar } from "lucide-react";
import { useState } from "react";
import { ReminderRecord } from "@/lib/db-repo";

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: ReminderRecord | null;
  onSnoozed: (reminderId: string, newDueDate: Date) => void;
}

export function SnoozeModal({
  isOpen,
  onClose,
  reminder,
  onSnoozed,
}: SnoozeModalProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState("");

  if (!reminder) return null;

  const now = new Date();

  // In 1 hr
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  // Tonight (9 PM)
  const tonight = new Date(now);
  tonight.setHours(21, 0, 0, 0);
  if (tonight <= now) {
    tonight.setDate(tonight.getDate() + 1);
  }

  // Tomorrow (9 AM)
  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);

  const options = [
    { label: "In 1 hour", date: inOneHour, timeStr: inOneHour.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) },
    { label: "Tonight (9 PM)", date: tonight, timeStr: "9:00 PM" },
    { label: "Tomorrow (9 AM)", date: tomorrowMorning, timeStr: "Tomorrow 9:00 AM" },
  ];

  const handleSelectOption = (date: Date) => {
    onSnoozed(reminder.id, date);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDate) {
      const d = new Date(customDate);
      if (!isNaN(d.getTime())) {
        onSnoozed(reminder.id, d);
        onClose();
      }
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
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-zinc-950/85 backdrop-blur-3xl border-t border-white/15 rounded-t-[36px] p-5 pb-safe z-50 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Snooze Reminder</h3>
                  <p className="text-[11px] text-zinc-300 truncate max-w-[240px]">
                    &quot;{reminder.title}&quot;
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-2">
              {options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleSelectOption(opt.date)}
                  className="w-full p-3.5 glass-card hover:bg-white/10 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99]"
                >
                  <span className="text-sm font-medium text-white">{opt.label}</span>
                  <span className="text-xs text-amber-300 font-mono glass-pill px-2 py-0.5 rounded-md">{opt.timeStr}</span>
                </button>
              ))}

              <button
                onClick={() => setShowCustom(!showCustom)}
                className="w-full p-3.5 glass-pill hover:bg-white/10 rounded-2xl flex items-center justify-between text-left text-xs text-zinc-300 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span>Pick custom date &amp; time</span>
                </span>
                <span>{showCustom ? "Hide" : "Select"}</span>
              </button>

              {showCustom && (
                <form onSubmit={handleCustomSubmit} className="pt-2 space-y-3">
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    required
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-black font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  >
                    Set Custom Snooze
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

