import * as webpush from "web-push";

export function configurePush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@remidify.app", publicKey, privateKey);
    return true;
  } catch { return false; }
}

export function pushErrorStatus(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number(error.statusCode) : undefined;
}

export const pushOptions = { TTL: 24 * 60 * 60, urgency: "high" as const, timeout: 10000 };
