import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbRepo } from "@/lib/db-repo";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  emoji: z.string().max(8).optional(),
  syncToCalendar: z.boolean().optional(),
});

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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = createWorkspaceSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const workspace = await dbRepo.createWorkspace(session.user.id, parsed.data);
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err: unknown) {
    console.error("Failed to create workspace:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
