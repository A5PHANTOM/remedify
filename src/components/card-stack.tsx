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
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[350px] aspect-[4/5] glass-panel-elevated rounded-[36px] p-8 flex flex-col items-center justify-center text-center space-y-5 select-none relative overflow-hidden"
      >
        {/* Ambient background glow inside empty state */}
        <div className="absolute w-44 h-44 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute w-36 h-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none -bottom-10" />

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-20 h-20 rounded-3xl glass-pill p-1 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]"
        >
          <div className="w-full h-full rounded-[22px] bg-gradient-to-tr from-emerald-500/20 via-emerald-400/30 to-teal-400/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-emerald-300 animate-pulse" />
        </motion.div>

        <div className="space-y-1.5 z-10">
          <h3 className="text-xl font-bold text-white tracking-tight">
            All Caught Up
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-[230px]">
            Zero pending reminders in this workspace. Take a breather or tap{" "}
            <span className="text-blue-400 font-semibold">+</span> to capture something new.
          </p>
        </div>

        <div className="pt-2 z-10">
          <span className="glass-pill px-3 py-1 rounded-full text-[11px] font-medium text-emerald-300/90 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Inbox Zero
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full max-w-[350px] aspect-[4/5] flex items-center justify-center perspective-[1200px]">
      {/* Third Card (Background Depth) */}
      {thirdCard && (
        <div className="absolute inset-0 glass-card rounded-[36px] border border-white/5 shadow-2xl pointer-events-none transform translate-y-7 scale-[0.88] opacity-35 transition-all duration-300" />
      )}

      {/* Second Card (Middle Depth) */}
      {secondCard && (
        <div className="absolute inset-0 glass-card rounded-[36px] border border-white/10 shadow-2xl pointer-events-none transform translate-y-3.5 scale-[0.94] opacity-75 transition-all duration-300" />
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

  // Smooth 3D tilt and rotation during drag
  const rotate = useTransform(x, [-200, 200], [-16, 16]);
  const rotateY = useTransform(x, [-200, 200], [-12, 12]);

  // Visual cues opacity based on drag distance
  const completeOpacity = useTransform(x, [35, 120], [0, 1]);
  const snoozeOpacity = useTransform(x, [-35, -120], [0, 1]);
  const rescheduleOpacity = useTransform(y, [-35, -110], [0, 1]);

  // Dynamic glow borders based on direction
  const rightGlowOpacity = useTransform(x, [10, 100], [0, 0.8]);
  const leftGlowOpacity = useTransform(x, [-10, -100], [0, 0.8]);
  const upGlowOpacity = useTransform(y, [-10, -100], [0, 0.8]);

  const [exitDirection, setExitDirection] = useState<
    "right" | "left" | "up" | null
  >(null);

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([15]);
      } catch {}
    }
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const cardWidth = 350;
    const thresholdX = cardWidth * 0.32; // 32% threshold
    const thresholdY = 90;

    // Swipe Right -> Mark Done
    if (info.offset.x > thresholdX) {
      triggerHaptic();
      setExitDirection("right");
      setTimeout(() => onComplete(reminder), 140);
      return;
    }

    // Swipe Left -> Snooze
    if (info.offset.x < -thresholdX) {
      triggerHaptic();
      setExitDirection("left");
      setTimeout(() => onSnooze(reminder), 140);
      return;
    }

    // Swipe Up -> Reschedule
    if (info.offset.y < -thresholdY) {
      triggerHaptic();
      setExitDirection("up");
      setTimeout(() => onReschedule(reminder), 140);
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
        rotateY,
        touchAction: "pan-y",
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.75}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.985 }}
      initial={{ scale: 0.94, opacity: 0, y: 14 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: 0,
        x: exitDirection === "right" ? 520 : exitDirection === "left" ? -520 : 0,
      }}
      exit={{
        opacity: 0,
        x: exitDirection === "right" ? 520 : exitDirection === "left" ? -520 : 0,
        y: exitDirection === "up" ? -450 : 0,
        scale: 0.88,
        transition: { duration: 0.22, ease: "easeOut" },
      }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={() => onTap(reminder)}
      className="absolute inset-0 glass-panel-elevated rounded-[36px] p-6 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none overflow-hidden"
    >
      {/* Specular Inner Highlight Overlay */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.09] to-transparent pointer-events-none rounded-t-[36px]" />

      {/* Dynamic Halo Glows */}
      <motion.div
        style={{ opacity: rightGlowOpacity }}
        className="absolute inset-0 rounded-[36px] shadow-[inset_0_0_40px_rgba(16,185,129,0.4),0_0_50px_rgba(16,185,129,0.3)] pointer-events-none border-2 border-emerald-400/50"
      />
      <motion.div
        style={{ opacity: leftGlowOpacity }}
        className="absolute inset-0 rounded-[36px] shadow-[inset_0_0_40px_rgba(245,158,11,0.4),0_0_50px_rgba(245,158,11,0.3)] pointer-events-none border-2 border-amber-400/50"
      />
      <motion.div
        style={{ opacity: upGlowOpacity }}
        className="absolute inset-0 rounded-[36px] shadow-[inset_0_0_40px_rgba(59,130,246,0.4),0_0_50px_rgba(59,130,246,0.3)] pointer-events-none border-2 border-blue-400/50"
      />

      {/* Workspace Indicator Strip with Ambient Glow */}
      <div
        className="absolute top-0 left-8 right-8 h-[2px] rounded-full opacity-80 shadow-[0_0_12px_currentColor]"
        style={{
          backgroundColor: reminder.workspace?.colour || "#3b82f6",
          color: reminder.workspace?.colour || "#3b82f6",
        }}
      />

      {/* Swipe Right Overlay Hint (Done) */}
      <motion.div
        style={{ opacity: completeOpacity }}
        className="absolute inset-0 bg-emerald-950/50 backdrop-blur-md rounded-[36px] flex items-center justify-center pointer-events-none z-30"
      >
        <div className="flex flex-col items-center text-emerald-400">
          <div className="w-18 h-18 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.6)]">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
          <span className="text-base font-extrabold uppercase tracking-widest mt-3 drop-shadow">
            Done
          </span>
        </div>
      </motion.div>

      {/* Swipe Left Overlay Hint (Snooze) */}
      <motion.div
        style={{ opacity: snoozeOpacity }}
        className="absolute inset-0 bg-amber-950/50 backdrop-blur-md rounded-[36px] flex items-center justify-center pointer-events-none z-30"
      >
        <div className="flex flex-col items-center text-amber-400">
          <div className="w-18 h-18 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.6)]">
            <Clock className="w-10 h-10 stroke-[3]" />
          </div>
          <span className="text-base font-extrabold uppercase tracking-widest mt-3 drop-shadow">
            Snooze
          </span>
        </div>
      </motion.div>

      {/* Swipe Up Overlay Hint (Reschedule) */}
      <motion.div
        style={{ opacity: rescheduleOpacity }}
        className="absolute inset-0 bg-blue-950/50 backdrop-blur-md rounded-[36px] flex items-center justify-center pointer-events-none z-30"
      >
        <div className="flex flex-col items-center text-blue-400">
          <div className="w-18 h-18 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            <Calendar className="w-10 h-10 stroke-[3]" />
          </div>
          <span className="text-base font-extrabold uppercase tracking-widest mt-3 drop-shadow">
            Reschedule
          </span>
        </div>
      </motion.div>

      {/* Card Header */}
      <div className="flex items-start justify-between z-10">
        <div className="flex items-center space-x-2">
          {reminder.workspace && (
            <span
              className="px-3 py-1.5 rounded-full text-xs font-semibold glass-pill flex items-center gap-1.5 shadow-sm"
              style={{
                borderColor: `${reminder.workspace.colour}40`,
                color: reminder.workspace.colour,
              }}
            >
              <span>{reminder.workspace.emoji}</span>
              <span className="text-zinc-200">{reminder.workspace.name}</span>
            </span>
          )}

          {isOverdue && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              OVERDUE
            </span>
          )}
        </div>

        {reminder.priority > 0 && (
          <span className="glass-pill px-2.5 py-1 rounded-full flex items-center text-amber-300 text-xs font-medium">
            <Flag className="w-3.5 h-3.5 mr-1 text-amber-400" />
            {reminder.priority === 2 ? "High" : "Med"}
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="my-auto space-y-3 z-10 py-2">
        <h2 className="text-2xl font-bold tracking-tight text-white leading-snug line-clamp-3 drop-shadow-sm">
          {reminder.title}
        </h2>

        {reminder.note && (
          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed glass-pill p-3 rounded-2xl">
            {reminder.note}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 text-xs">
          <span
            className={`glass-pill px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold ${
              isOverdue ? "text-red-300 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "text-blue-300 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {relativeText}
          </span>

          {reminder.repeatRule && (
            <span className="glass-pill px-2.5 py-1.5 rounded-full flex items-center gap-1 text-[11px] text-zinc-400">
              <Repeat className="w-3 h-3 text-indigo-400" />
              {reminder.repeatRule}
            </span>
          )}
        </div>
      </div>

      {/* Card Footer Gestures Legend */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] z-10">
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <ArrowRight className="w-3 h-3" /> Done
        </span>
        <span className="flex items-center gap-1 text-amber-400 font-medium">
          <ArrowLeft className="w-3 h-3" /> Snooze
        </span>
        <span className="flex items-center gap-1 text-blue-400 font-medium">
          <ArrowUp className="w-3 h-3" /> Reschedule
        </span>
      </div>
    </motion.div>
  );
}
