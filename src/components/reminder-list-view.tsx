"use client";

import type { ReminderRecord } from "@/lib/db-repo";
import { formatDueTime } from "@/lib/date-utils";
import { Check, Clock3, Flag, Plus, Repeat, Sparkles, ArrowUpRight } from "lucide-react";

interface ReminderListViewProps {
  reminders: ReminderRecord[];
  onToggleDone: (reminder: ReminderRecord) => void;
  onOpenDetail?: (reminder: ReminderRecord) => void;
  onAdd?: () => void;
}

export function ReminderListView({ reminders, onToggleDone, onOpenDetail, onAdd }: ReminderListViewProps) {
  if (reminders.length === 0) return (
    <div className="empty-state"><div className="empty-illustration"><span /><span /><Sparkles size={32} /></div>
      <h3>A little space to breathe.</h3><p>Put it here. Let it go.<br />We’ll help you remember the little things.</p>
      <button className="secondary-button" onClick={onAdd}><Plus size={16} /> Add a reminder</button></div>
  );
  const now = new Date();
  const groups: { label: string; items: ReminderRecord[]; tone?: string }[] = [
    { label: "Needs a moment", items: [], tone: "overdue" },
    { label: "Today", items: [] }, { label: "Coming up", items: [] }, { label: "Completed", items: [], tone: "completed" },
  ];
  [...reminders].sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)).forEach((reminder) => {
    const due = new Date(reminder.dueAt);
    groups[reminder.status === "done" ? 3 : due < now ? 0 : due.toDateString() === now.toDateString() ? 1 : 2].items.push(reminder);
  });
  return <div className="reminder-groups">{groups.filter((group) => group.items.length).map((group) => (
    <section key={group.label} className={`reminder-group ${group.tone || ""}`}>
      <h3 className="group-label">{group.label}<span>{group.items.length}</span></h3>
      {group.items.map((reminder) => {
        const done = reminder.status === "done";
        const due = formatDueTime(reminder.dueAt);
        return <article key={reminder.id} className={`reminder-row ${done ? "is-done" : ""}`}>
          <button className="complete-button" aria-label={`${done ? "Reopen" : "Complete"} ${reminder.title}`} aria-pressed={done} onClick={() => onToggleDone(reminder)}>{done && <Check size={15} />}</button>
          <button className="reminder-body" onClick={() => onOpenDetail?.(reminder)}>
            <strong>{reminder.title}</strong>{reminder.note && <p>{reminder.note}</p>}
            <div className="reminder-meta"><span className={due.isOverdue && !done ? "time-overdue" : ""}><Clock3 size={12} />{due.relativeText}</span>{reminder.workspace && <span><i style={{ backgroundColor: reminder.workspace.colour }} />{reminder.workspace.name}</span>}{reminder.repeatRule && <Repeat size={12} aria-label={`Repeats ${reminder.repeatRule}`} />}{reminder.priority > 0 && <Flag size={12} className="priority-flag" aria-label={reminder.priority === 2 ? "High priority" : "Medium priority"} />}</div>
          </button><ArrowUpRight size={15} className="row-arrow" />
        </article>;
      })}
    </section>
  ))}</div>;
}
