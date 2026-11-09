"use client";

import type { ReminderRecord } from "@/lib/db-repo";
import { Check, Clock3, Flag, Plus, Repeat, ArrowUpRight } from "lucide-react";
import { groupAgenda } from "@/lib/agenda";

interface ReminderListViewProps {
  reminders: ReminderRecord[];
  now: number;
  onToggleDone: (reminder: ReminderRecord) => void;
  onOpenDetail?: (reminder: ReminderRecord) => void;
  onAdd?: () => void;
}

export function ReminderListView({ reminders, now, onToggleDone, onOpenDetail, onAdd }: ReminderListViewProps) {
  if (!reminders.length) return <div className="empty-state"><Check size={28} /><h3>All clear here.</h3><p>Add a task for today or plan something further ahead.</p><button className="secondary-button" onClick={onAdd}><Plus size={16} /> Add a task</button></div>;
  return <div className="reminder-groups">{groupAgenda(reminders, now).map((group) => <section key={group.key} className={`reminder-group ${group.pending ? "overdue" : ""}`}>
    <h3 className="group-label">{group.pending && <Flag size={13} />}{group.label}<span>{group.items.length}</span>{group.pending && <small>TOP PRIORITY</small>}</h3>
    {group.pending && <p className="pending-caption">Past due. Stays here until you complete or reschedule it.</p>}
    <div className="task-group-surface">{group.items.map((reminder) => {
      const due = new Date(reminder.dueAt);
      const done = reminder.status === "done";
      return <article key={reminder.id} className={`reminder-row ${done ? "is-done" : ""}`}>
        <button className="complete-button" aria-label={`${done ? "Reopen" : "Complete"} ${reminder.title}`} aria-pressed={done} onClick={() => onToggleDone(reminder)}>{done && <Check size={15} />}</button>
        <button className="reminder-body" onClick={() => onOpenDetail?.(reminder)}><strong>{reminder.title}</strong>{reminder.note && <p>{reminder.note}</p>}
          <div className="reminder-meta"><span className={group.pending ? "time-overdue" : ""}><Clock3 size={12} />{group.pending || done ? `${due.toLocaleDateString("en", { month: "short", day: "numeric" })} · ` : ""}{due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>{group.pending && <span className="pending-badge">Pending</span>}{reminder.workspace && <span><i style={{ backgroundColor: reminder.workspace.colour }} />{reminder.workspace.name}</span>}{reminder.repeatRule && <Repeat size={12} aria-label={`Repeats ${reminder.repeatRule}`} />}{reminder.priority > 0 && !group.pending && <Flag size={12} className="priority-flag" aria-label={reminder.priority === 2 ? "High priority" : "Medium priority"} />}</div>
        </button><ArrowUpRight size={16} className="row-arrow" />
      </article>;
    })}</div>
  </section>)}</div>;
}
