import { NextResponse } from "next/server";
import { dbRepo } from "@/lib/db-repo";
import * as webpush from "web-push";

// Configure web-push with VAPID keys if provided
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@remidify.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function GET(req: Request) {
  try {
    // Verify x-cron-secret header
    const cronSecretHeader =
      req.headers.get("x-cron-secret") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && cronSecretHeader !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden: invalid cron secret" }, { status: 403 });
    }

    // Select open reminders due now where notified_at is null (idempotent)
    const dueReminders = await dbRepo.getDueRemindersForDispatch();

    let totalNotificationsSent = 0;
    let prunedSubscriptions = 0;

    for (const item of dueReminders) {
      const subscriptions = await dbRepo.getPushSubscriptionsForUser(item.userId);

      const payload = JSON.stringify({
        title: "Remidify",
        body: item.title,
        url: `/?reminderId=${item.id}`,
        reminderId: item.id,
        tag: `remidify-${item.id}`,
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          totalNotificationsSent++;
        } catch (err: any) {
          // PRD requirement: Remove push subscriptions that return HTTP 404 or 410
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await dbRepo.removePushSubscription(sub.endpoint);
            prunedSubscriptions++;
          } else {
            console.error(`[Push Error] Endpoint: ${sub.endpoint}`, err);
          }
        }
      }

      // Mark notified to guarantee no duplicates
      await dbRepo.markReminderNotified(item.id);
    }

    return NextResponse.json({
      success: true,
      dueRemindersProcessed: dueReminders.length,
      notificationsSent: totalNotificationsSent,
      prunedSubscriptions,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("Cron dispatch execution failed:", err);
    return NextResponse.json(
      { error: "Internal server error during dispatch" },
      { status: 500 }
    );
  }
}
