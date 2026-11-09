import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { dbRepo } from "@/lib/db-repo";
import { configurePush, pushErrorStatus, pushOptions } from "@/lib/push-server";
import * as webpush from "web-push";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!configurePush()) return NextResponse.json({ error: "Notifications are not configured. Please try again later." }, { status: 503 });
    const parsed = z.object({ endpoint: z.string().url() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Reconnect this device before sending a test." }, { status: 400 });
    const subscriptions = await dbRepo.getPushSubscriptionsForUser(user.id);
    const sub = subscriptions.find((item) => item.endpoint === parsed.data.endpoint);
    if (!sub) return NextResponse.json({ error: "This device is not connected. Enable notifications again." }, { status: 404 });
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({
        title: "A little nudge from Remidify", body: "You’re connected. Your reminders have a home on your lock screen.",
        url: "/", tag: "remidify-test",
      }), { ...pushOptions, TTL: 60 });
    } catch (error) {
      const status = pushErrorStatus(error);
      if (status === 404 || status === 410) {
        await dbRepo.removePushSubscription(sub.endpoint, user.id);
        return NextResponse.json({ error: "This connection expired. Enable notifications again." }, { status: 410 });
      }
      console.error("Test push rejected", { status });
      return NextResponse.json({ error: "The notification service couldn’t accept the test. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ success: true, sent: 1 });
  } catch {
    return NextResponse.json({ error: "Couldn’t send the test notification." }, { status: 500 });
  }
}
