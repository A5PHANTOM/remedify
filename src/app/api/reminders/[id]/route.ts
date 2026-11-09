import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbRepo } from "@/lib/db-repo";
import { computeNextOccurrence } from "@/lib/recurrence";
import { z } from "zod";

const updateReminderSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  note: z.string().max(2000).optional().nullable(),
  dueAt: z.string().datetime({ offset: true }).or(z.string()).optional(),
  status: z.enum(["open", "done"]).optional(),
  priority: z.number().int().min(0).max(2).optional(),
  repeatRule: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  workspaceId: z.string().uuid().optional(),
  action: z
    .enum(["edited", "snoozed", "rescheduled", "completed", "reopened"])
    .optional(),
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
    const parsed = updateReminderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await dbRepo.getReminderById(session.user.id, id);
    if (!existing) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    const updates: any = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.note !== undefined) updates.note = parsed.data.note;
    if (parsed.data.dueAt !== undefined) updates.dueAt = new Date(parsed.data.dueAt);
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
    if (parsed.data.repeatRule !== undefined) updates.repeatRule = parsed.data.repeatRule;
    if (parsed.data.workspaceId !== undefined) updates.workspaceId = parsed.data.workspaceId;

    let action = parsed.data.action || "edited";
    if (updates.status === "done" && existing.status !== "done") {
      action = "completed";
    } else if (updates.status === "open" && existing.status === "done") {
      action = "reopened";
    }

    if (action === "snoozed") {
      updates.snoozedCount = (existing.snoozedCount || 0) + 1;
    }

    const updated = await dbRepo.updateReminder(
      session.user.id,
      id,
      updates,
      action
    );

    let nextOccurrence = null;
    // PRD Section 4.4: Repeat rules: when a repeating reminder is marked done, create the next occurrence
    if (updates.status === "done" && existing.repeatRule) {
      const nextDue = computeNextOccurrence(
        existing.dueAt,
        existing.repeatRule as "daily" | "weekly" | "monthly"
      );
      nextOccurrence = await dbRepo.createReminder({
        userId: session.user.id,
        workspaceId: existing.workspaceId,
        title: existing.title,
        note: existing.note,
        dueAt: nextDue,
        priority: existing.priority,
        repeatRule: existing.repeatRule,
      });
    }

    return NextResponse.json({ reminder: updated, nextOccurrence });
  } catch (err: unknown) {
    console.error("Failed to update reminder:", err);
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
    const deleted = await dbRepo.deleteReminder(session.user.id, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to delete reminder:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

