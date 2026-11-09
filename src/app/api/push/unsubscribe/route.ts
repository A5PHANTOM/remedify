import { NextResponse } from "next/server";
import { dbRepo } from "@/lib/db-repo";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const json = await req.json();
    const parsed = unsubscribeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    await dbRepo.removePushSubscription(parsed.data.endpoint, user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to remove push subscription:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

