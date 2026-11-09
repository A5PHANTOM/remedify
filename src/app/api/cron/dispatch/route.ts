import { NextResponse } from "next/server";
import { dbRepo } from "@/lib/db-repo";
import { configurePush, pushErrorStatus, pushOptions } from "@/lib/push-server";
import * as webpush from "web-push";

export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!configurePush()) return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
  try {
    const dueReminders = await dbRepo.getDueRemindersForDispatch();
    let notificationsSent = 0;
    let prunedSubscriptions = 0;
    let remindersNotified = 0;
    const started = Date.now();
    for (const item of dueReminders) {
      // Leave the rest pending for the next invocation instead of timing out mid-batch.
      if (Date.now() - started > 40000) break;
      const subscriptions = await dbRepo.getPushSubscriptionsForUser(item.userId);
      const payload = JSON.stringify({ title: "Remidify", body: item.title,
        url: `/?reminderId=${item.id}`, reminderId: item.id, tag: `remidify-${item.id}` });
      const results = await Promise.all(subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, pushOptions);
          notificationsSent++;
          return true;
        } catch (error) {
          const status = pushErrorStatus(error);
          if (status === 404 || status === 410) {
            await dbRepo.removePushSubscription(sub.endpoint, item.userId);
            prunedSubscriptions++;
          } else console.error("Reminder push failed", { reminderId: item.id, status });
          return false;
        }
      }));
      // A missing/expired device or a transient provider failure must not consume a reminder.
      if (results.some(Boolean)) {
        await dbRepo.markReminderNotified(item.id);
        remindersNotified++;
      }
    }
    return NextResponse.json({ success: true, remindersNotified, notificationsSent, prunedSubscriptions, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Reminder dispatch failed", error);
    return NextResponse.json({ error: "Reminder dispatch failed" }, { status: 500 });
  }
}
