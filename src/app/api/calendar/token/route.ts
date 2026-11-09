import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { dbRepo } from "@/lib/db-repo";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      calendarToken: user.calendarToken,
    });
  } catch (err: unknown) {
    console.error("Failed to get calendar token:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newToken = await dbRepo.regenerateCalendarToken(user.id);
    return NextResponse.json({ calendarToken: newToken });
  } catch (err: unknown) {
    console.error("Failed to regenerate calendar token:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

