import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbRepo } from "@/lib/db-repo";
import * as webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@remidify.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await dbRepo.getPushSubscriptionsForUser(session.user.id);
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: "No registered push devices found. Please enable notifications on this device first." },
        { status: 400 }
      );
    }

    const payload = JSON.stringify({
      title: "Remidify Alert Test",
      body: "⚡ Test notification received! Reliable alerts are active.",
      url: "/",
      tag: "test-notification",
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await dbRepo.removePushSubscription(sub.endpoint);
        }
      }
    }

    return NextResponse.json({ success: true, sent });
  } catch (err: unknown) {
    console.error("Failed to send test push:", err);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
