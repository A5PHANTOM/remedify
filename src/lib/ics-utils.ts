import { ReminderRecord } from "./db-repo";

function formatIcsDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateCalendarFeedICS(
  reminders: ReminderRecord[],
  calendarName = "Remidify Reminders"
): string {
  const nowStr = formatIcsDate(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Remidify//iPhone Swipe Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:UTC",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];

  for (const item of reminders) {
    const startDate = new Date(item.dueAt);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30-minute duration
    const summary = item.workspace
      ? `[${item.workspace.name}] ${item.title}`
      : item.title;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:remidify-${item.id}@remidify.app`);
    lines.push(`DTSTAMP:${nowStr}`);
    lines.push(`DTSTART:${formatIcsDate(startDate)}`);
    lines.push(`DTEND:${formatIcsDate(endDate)}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);

    if (item.note) {
      lines.push(`DESCRIPTION:${escapeIcsText(item.note)}`);
    }

    lines.push("STATUS:CONFIRMED");

    // VALARM at time zero
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-PT0M");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${escapeIcsText(item.title)}`);
    lines.push("END:VALARM");

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Join lines with CRLF per RFC 5545 specification
  return lines.join("\r\n");
}

export function generateSingleReminderICS(item: ReminderRecord): string {
  return generateCalendarFeedICS([item], `Remidify - ${item.title}`);
}

