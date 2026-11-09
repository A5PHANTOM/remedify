import type { ReminderRecord } from "./db-repo";

/** Overdue is derived from the deadline, so a task never expires or auto-completes. */
export function groupAgenda(reminders: ReminderRecord[], now: number) {
  const today = new Date(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const groups = new Map<string, { key: string; label: string; pending: boolean; items: ReminderRecord[] }>();
  const sorted = [...reminders].sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || +new Date(a.dueAt) - +new Date(b.dueAt));
  for (const reminder of sorted) {
    const due = new Date(reminder.dueAt);
    const done = reminder.status === "done";
    const pending = !done && +due < now;
    const key = done ? "completed" : pending ? "pending" : due.toDateString();
    const label = done ? "Completed" : pending ? "Pending" : due.toDateString() === today.toDateString() ? "Today" : due.toDateString() === tomorrow.toDateString() ? "Tomorrow" : due.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric", ...(due.getFullYear() !== today.getFullYear() ? { year: "numeric" as const } : {}) });
    if (!groups.has(key)) groups.set(key, { key, label, pending, items: [] });
    groups.get(key)!.items.push(reminder);
  }
  return [...groups.values()];
}
