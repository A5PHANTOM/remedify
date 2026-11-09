import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbRepo } from "@/lib/db-repo";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await dbRepo.getWorkspaces(session.user.id);
    return NextResponse.json({ workspaces });
  } catch (err: unknown) {
    console.error("Failed to fetch workspaces:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

