import * as chrono from "chrono-node";

export interface ParsedDateResult {
  date: Date | null;
  textWithoutDate: string;
}

export function parseNaturalLanguageDate(text: string): ParsedDateResult {
  const parsedResults = chrono.parse(text);
  if (!parsedResults || parsedResults.length === 0) {
    return { date: null, textWithoutDate: text };
  }

  const firstResult = parsedResults[0];
  const date = firstResult.date();

  // Strip parsed date snippet from the title if appropriate
  const matchText = firstResult.text;
  const textWithoutDate = text.replace(matchText, "").replace(/\s+/g, " ").trim();

  return { date, textWithoutDate };
}

export interface QuickDatePreset {
  id: string;
  label: string;
  category: "sameday" | "future";
  getDate: () => Date;
}

export function getQuickDatePresets(): QuickDatePreset[] {
  const now = new Date();

  // In 1 hr
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  // This evening (6 PM)
  const thisEvening = new Date(now);
  thisEvening.setHours(18, 0, 0, 0);
  if (thisEvening <= now) {
    thisEvening.setDate(thisEvening.getDate() + 1);
  }

  // Tonight (9 PM)
  const tonight = new Date(now);
  tonight.setHours(21, 0, 0, 0);
  if (tonight <= now) {
    tonight.setDate(tonight.getDate() + 1);
  }

  // Tomorrow 9 AM
  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);

  // Next Monday 9 AM
  const nextMonday = new Date(now);
  const dayOfWeek = nextMonday.getDay(); // 0 is Sunday, 1 is Monday
  const daysUntilNextMon = ((8 - dayOfWeek) % 7) || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilNextMon);
  nextMonday.setHours(9, 0, 0, 0);

  return [
    {
      id: "in-1-hr",
      label: "In 1 hr",
      category: "sameday",
      getDate: () => inOneHour,
    },
    {
      id: "this-evening",
      label: "This evening (6 PM)",
      category: "sameday",
      getDate: () => thisEvening,
    },
    {
      id: "tonight",
      label: "Tonight (9 PM)",
      category: "sameday",
      getDate: () => tonight,
    },
    {
      id: "tomorrow-9am",
      label: "Tomorrow 9 AM",
      category: "future",
      getDate: () => tomorrowMorning,
    },
    {
      id: "next-mon-9am",
      label: "Next Mon 9 AM",
      category: "future",
      getDate: () => nextMonday,
    },
  ];
}

export function formatDueTime(dateInput: Date | string): {
  relativeText: string;
  isOverdue: boolean;
  isToday: boolean;
} {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const isOverdue = date < now;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  let relativeText = "";
  if (isToday) {
    relativeText = `Today ${timeStr}`;
  } else if (isTomorrow) {
    relativeText = `Tomorrow ${timeStr}`;
  } else {
    const month = date.toLocaleDateString([], { month: "short" });
    const day = date.getDate();
    relativeText = `${month} ${day}, ${timeStr}`;
  }

  return { relativeText, isOverdue, isToday };
}

