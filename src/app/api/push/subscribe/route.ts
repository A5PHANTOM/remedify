import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { dbRepo } from "@/lib/db-repo";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = subscribeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent");
    const sub = await dbRepo.savePushSubscription(user.id, {
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent,
    });

    return NextResponse.json({ success: true, subscription: sub }, { status: 201 });
  } catch (err: unknown) {
    console.error("Failed to save push subscription:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

