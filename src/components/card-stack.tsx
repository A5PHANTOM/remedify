"use client";

import { useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
  AnimatePresence,
} from "framer-motion";
import {
  Check,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  Flag,
  Repeat,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { ReminderRecord } from "@/lib/db-repo";
import { formatDueTime } from "@/lib/date-utils";

interface CardStackProps {
  reminders: ReminderRecord[];
  onComplete: (reminder: ReminderRecord) => void;
  onSnooze: (reminder: ReminderRecord) => void;
  onReschedule: (reminder: ReminderRecord) => void;
  onTap: (reminder: ReminderRecord) => void;
}

export function CardStack({
  reminders,
  onComplete,
  onSnooze,
  onReschedule,
  onTap,
}: CardStackProps) {
  // Filter only open reminders
  const openReminders = reminders.filter((r) => r.status === "open");

  // Sort: Overdue first, then due today by time, then upcoming
  const sortedStack = [...openReminders].sort((a, b) => {
    const timeA = new Date(a.dueAt).getTime();
    const timeB = new Date(b.dueAt).getTime();
    const now = Date.now();

    const isOverdueA = timeA < now;
    const isOverdueB = timeB < now;

    if (isOverdueA && !isOverdueB) return -1;
    if (!isOverdueA && isOverdueB) return 1;

    return timeA - timeB;
  });

  const topCard = sortedStack[0];
  const secondCard = sortedStack[1];
  const thirdCard = sortedStack[2];

  if (!topCard) {
    return (
      <div className="w-full max-w-[350px] aspect-[4/5] bg-zinc-950/40 rounded-3xl border border-zinc-800/80 p-8 flex flex-col items-center justify-center text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white tracking-tight">
            All Clear
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-[220px]">
            No pending reminders in this workspace. You&apos;re completely caught
            up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[350px] aspect-[4/5] flex items-center justify-center">
      {/* Third Card (Background Depth) */}
      {thirdCard && (
        <div
          className="absolute inset-0 bg-zinc-900/60 rounded-3xl border border-zinc-800/40 shadow-md pointer-events-none transform translate-y-6 scale-[0.88] opacity-40 transition-transform"
        />
      )}

      {/* Second Card (Middle Depth) */}
      {secondCard && (
        <div
          className="absolute inset-0 bg-zinc-900/90 rounded-3xl border border-zinc-800/80 shadow-lg pointer-events-none transform translate-y-3 scale-[0.94] opacity-80 transition-transform"
        />
      )}

      {/* Interactive Top Card */}
      <AnimatePresence mode="popLayout">
        <InteractiveCard
          key={topCard.id}
          reminder={topCard}
          onComplete={onComplete}
          onSnooze={onSnooze}
          onReschedule={onReschedule}
          onTap={onTap}
        />
      </AnimatePresence>
    </div>
  );
}

interface InteractiveCardProps {
  reminder: ReminderRecord;
  onComplete: (reminder: ReminderRecord) => void;
  onSnooze: (reminder: ReminderRecord) => void;
  onReschedule: (reminder: ReminderRecord) => void;
  onTap: (reminder: ReminderRecord) => void;
}

function InteractiveCard({
  reminder,
  onComplete,
  onSnooze,
  onReschedule,
  onTap,
}: InteractiveCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth rotation during drag
  const rotate = useTransform(x, [-200, 200], [-18, 18]);

  // Visual cues opacity based on drag distance
  const completeOpacity = useTransform(x, [40, 130], [0, 1]);
  const snoozeOpacity = useTransform(x, [-40, -130], [0, 1]);
  const rescheduleOpacity = useTransform(y, [-40, -120], [0, 1]);

  const [exitDirection, setExitDirection] = useState<
    "right" | "left" | "up" | null
  >(null);

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([10]);
      } catch {}
    }
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const cardWidth = 350;
    const thresholdX = cardWidth * 0.35; // 35% threshold
    const thresholdY = 100;

    // Swipe Right -> Mark Done
    if (info.offset.x > thresholdX) {
      triggerHaptic();
      setExitDirection("right");
      setTimeout(() => onComplete(reminder), 150);
      return;
    }

    // Swipe Left -> Snooze
    if (info.offset.x < -thresholdX) {
      triggerHaptic();
      setExitDirection("left");
      setTimeout(() => onSnooze(reminder), 150);
      return;
    }

    // Swipe Up -> Reschedule
    if (info.offset.y < -thresholdY) {
      triggerHaptic();
      setExitDirection("up");
      setTimeout(() => onReschedule(reminder), 150);
      return;
    }
  };

  const { relativeText, isOverdue } = formatDueTime(reminder.dueAt);

  return (
    <motion.div
      style={{
        x,
        y,
        rotate,
        touchAction: "pan-y",
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      initial={{ scale: 0.95, opacity: 0, y: 10 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: 0,
        x: exitDirection === "right" ? 500 : exitDirection === "left" ? -500 : 0,
      }}
      exit={{
        opacity: 0,
        x: exitDirection === "right" ? 500 : exitDirection === "left" ? -500 : 0,
        y: exitDirection === "up" ? -400 : 0,
        scale: 0.9,
        transition: { duration: 0.2 },
      }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      onClick={() => onTap(reminder)}
      className="absolute inset-0 bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-2xl p-6 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none overflow-hidden"
    >
      {/* Top Accent Strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{
          backgroundColor: reminder.workspace?.colour || "#0A84FF",
        }}
      />

      {/* Swipe Right Overlay Hint (Done) */}
      <motion.div
        style={{ opacity: completeOpacity }}
        className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-400 rounded-3xl flex items-center justify-center pointer-events-none z-20 backdrop-blur-[2px]"
      >
        <div className="flex flex-col items-center text-emerald-400">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>
          <span className="text-sm font-extrabold uppercase tracking-wider mt-2">
            Done
          </span>
        </div>
      </motion.div>

      {/* Swipe Left Overlay Hint (Snooze) */}
      <motion.div
        style={{ opacity: snoozeOpacity }}
        className="absolute inset-0 bg-amber-500/20 border-2 border-amber-400 rounded-3xl flex items-center justify-center pointer-events-none z-20 backdrop-blur-[2px]"
      >
        <div className="flex flex-col items-center text-amber-400">
          <div className="w-16 h-16 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg">
            <Clock className="w-9 h-9 stroke-[3]" />
          </div>
          <span className="text-sm font-extrabold uppercase tracking-wider mt-2">
            Snooze
          </span>
        </div>
      </motion.div>

      {/* Swipe Up Overlay Hint (Reschedule) */}
      <motion.div
        style={{ opacity: rescheduleOpacity }}
        className="absolute inset-0 bg-blue-500/20 border-2 border-accent-blue rounded-3xl flex items-center justify-center pointer-events-none z-20 backdrop-blur-[2px]"
      >
        <div className="flex flex-col items-center text-accent-blue">
          <div className="w-16 h-16 rounded-full bg-accent-blue text-white flex items-center justify-center shadow-lg">
            <Calendar className="w-9 h-9 stroke-[3]" />
          </div>
          <span className="text-sm font-extrabold uppercase tracking-wider mt-2">
            Reschedule
          </span>
        </div>
      </motion.div>

      {/* Card Header */}
      <div className="flex items-start justify-between z-10">
        <div className="flex items-center space-x-2">
          {reminder.workspace && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 shadow-sm"
              style={{
                borderColor: `${reminder.workspace.colour}50`,
                backgroundColor: `${reminder.workspace.colour}18`,
                color: reminder.workspace.colour,
              }}
            >
              <span>{reminder.workspace.emoji}</span>
              <span>{reminder.workspace.name}</span>
            </span>
          )}

          {isOverdue && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              OVERDUE
            </span>
          )}
        </div>

        {reminder.priority > 0 && (
          <span className="flex items-center text-amber-400 text-xs font-semibold">
            <Flag className="w-3.5 h-3.5 mr-1" />
            {reminder.priority === 2 ? "High" : "Med"}
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="my-auto space-y-3 z-10">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] leading-snug line-clamp-3">
          {reminder.title}
        </h2>

        {reminder.note && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/50">
            {reminder.note}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1 text-xs">
          <span
            className={`flex items-center gap-1.5 font-semibold ${
              isOverdue ? "text-red-400" : "text-accent-blue"
            }`}
          >
            <Clock className="w-4 h-4" />
            {relativeText}
          </span>

          {reminder.repeatRule && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded-md">
              <Repeat className="w-3 h-3" />
              {reminder.repeatRule}
            </span>
          )}
        </div>
      </div>

      {/* Card Footer Gestures Legend */}
      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-zinc-500 z-10">
        <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
          <Check className="w-3 h-3" /> Right: Done
        </span>
        <span className="flex items-center gap-1 text-amber-400/90 font-medium">
          <Clock className="w-3 h-3" /> Left: Snooze
        </span>
        <span className="flex items-center gap-1 text-accent-blue/90 font-medium">
          <Calendar className="w-3 h-3" /> Up: Reschedule
        </span>
      </div>
    </motion.div>
  );
}
