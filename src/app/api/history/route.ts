import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbRepo } from "@/lib/db-repo";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reminderId = searchParams.get("reminderId") || undefined;

    const logs = await dbRepo.getActivityLog(session.user.id, reminderId);
    return NextResponse.json({ logs });
  } catch (err: unknown) {
    console.error("Failed to fetch activity logs:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

