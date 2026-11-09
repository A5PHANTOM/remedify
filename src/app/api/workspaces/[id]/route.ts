import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbRepo } from "@/lib/db-repo";
import { z } from "zod";

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  emoji: z.string().max(8).optional(),
  syncToCalendar: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const json = await req.json();
    const parsed = updateWorkspaceSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const updated = await dbRepo.updateWorkspace(session.user.id, id, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { error: "Workspace not found or cannot be modified" },
        { status: 400 }
      );
    }

    return NextResponse.json({ workspace: updated });
  } catch (err: unknown) {
    console.error("Failed to update workspace:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const reassignToMain = searchParams.get("reassign") !== "false";

    const success = await dbRepo.deleteWorkspace(session.user.id, id, reassignToMain);
    if (!success) {
      return NextResponse.json(
        { error: "Cannot delete the default Main workspace" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to delete workspace:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

