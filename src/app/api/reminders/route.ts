import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbRepo } from "@/lib/db-repo";
import { z } from "zod";

const createReminderSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  workspaceId: z.string().uuid("Invalid workspace ID").optional(),
  note: z.string().max(2000).optional().nullable(),
  dueAt: z.string().datetime({ offset: true }).or(z.string()),
  priority: z.number().int().min(0).max(2).optional().default(0),
  repeatRule: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "done" || statusParam === "all" ? statusParam : "open";

    const reminders = await dbRepo.getReminders(session.user.id, {
      workspaceId,
      status,
    });

    return NextResponse.json({ reminders });
  } catch (err: unknown) {
    console.error("Failed to fetch reminders:", err);
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
    const parsed = createReminderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title, note, dueAt, priority, repeatRule } = parsed.data;

    // Resolve workspace: use provided workspaceId, or default to user's "Main" workspace
    let targetWorkspaceId = parsed.data.workspaceId;
    if (!targetWorkspaceId) {
      const mainWs = await dbRepo.ensureMainWorkspace(session.user.id);
      targetWorkspaceId = mainWs.id;
    }

    const parsedDueDate = new Date(dueAt);
    if (isNaN(parsedDueDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid due date format" },
        { status: 400 }
      );
    }

    const reminder = await dbRepo.createReminder({
      userId: session.user.id,
      workspaceId: targetWorkspaceId,
      title,
      note,
      dueAt: parsedDueDate,
      priority,
      repeatRule,
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (err: unknown) {
    console.error("Failed to create reminder:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
