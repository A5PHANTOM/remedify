export function computeNextOccurrence(
  currentDueAt: Date | string,
  repeatRule: "daily" | "weekly" | "monthly"
): Date {
  const current =
    typeof currentDueAt === "string" ? new Date(currentDueAt) : new Date(currentDueAt.getTime());

  const next = new Date(current);

  switch (repeatRule) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly": {
      const currentDay = next.getDate();
      next.setMonth(next.getMonth() + 1);
      // Handle month overflow (e.g. Jan 31 -> Feb 28)
      if (next.getDate() !== currentDay) {
        next.setDate(0); // Last day of previous month
      }
      break;
    }
  }

  return next;
}

