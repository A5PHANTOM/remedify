import { dbRepo } from "@/lib/db-repo";
import { generateSingleReminderICS } from "@/lib/ics-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id.replace(/\.ics$/i, "").trim();

    // Find reminder across database
    let reminder = null;
    const allWorkspaces = await dbRepo.getWorkspaces(""); // fallback
    // Or direct lookup
    for (const r of (await dbRepo.getReminders("", { status: "all" }))) {
      if (r.id === cleanId) {
        reminder = r;
        break;
      }
    }

    if (!reminder) {
      return new Response("Reminder not found", { status: 404 });
    }

    const icsContent = generateSingleReminderICS(reminder);

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="reminder-${cleanId}.ics"`,
      },
    });
  } catch (err: unknown) {
    console.error("Failed to generate single reminder ICS:", err);
    return new Response("Internal server error", { status: 500 });
  }
}

