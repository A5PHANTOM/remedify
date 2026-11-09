import { NextResponse } from "next/server";
import { dbRepo } from "@/lib/db-repo";
import { generateCalendarFeedICS } from "@/lib/ics-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const cleanToken = token.replace(/\.ics$/i, "").trim();

    const user = await dbRepo.findUserByCalendarToken(cleanToken);
    if (!user) {
      return new Response("Calendar feed not found", { status: 404 });
    }

    const reminders = await dbRepo.getCalendarReminders(user.id);
    const icsContent = generateCalendarFeedICS(
      reminders,
      `${user.name ? user.name + "'s " : ""}Remidify Reminders`
    );

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="remidify.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to generate calendar feed:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
