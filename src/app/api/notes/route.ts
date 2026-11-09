import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/current-user";

const noteInput = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(200), body: z.string().max(50000) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Notes storage is unavailable" }, { status: 503 });
  try {
    const notes = await db.select().from(schema.notes).where(eq(schema.notes.userId, user.id)).orderBy(desc(schema.notes.updatedAt));
    return NextResponse.json({ notes });
  } catch { return NextResponse.json({ error: "Couldn’t load notes. Please try again." }, { status: 500 }); }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Notes storage is unavailable" }, { status: 503 });
  const input = noteInput.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a title (up to 200 characters) and a note (up to 50,000 characters)." }, { status: 400 });
  try {
    const { id, title, body } = input.data;
    const [note] = id
      ? await db.update(schema.notes).set({ title, body, updatedAt: new Date() }).where(and(eq(schema.notes.id, id), eq(schema.notes.userId, user.id))).returning()
      : await db.insert(schema.notes).values({ userId: user.id, title, body }).returning();
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    return NextResponse.json({ note }, { status: id ? 200 : 201 });
  } catch { return NextResponse.json({ error: "Couldn’t save your note. Your draft is still here." }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Notes storage is unavailable" }, { status: 503 });
  const id = z.string().uuid().safeParse(new URL(req.url).searchParams.get("id"));
  if (!id.success) return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  try {
    const deleted = await db.delete(schema.notes).where(and(eq(schema.notes.id, id.data), eq(schema.notes.userId, user.id))).returning({ id: schema.notes.id });
    if (!deleted.length) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Couldn’t delete this note. Please try again." }, { status: 500 }); }
}
