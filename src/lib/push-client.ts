export type PushState = "checking" | "install" | "unsupported" | "blocked" | "available" | "active" | "error";

export function getPushAvailability(): PushState {
  if (typeof window === "undefined") return "checking";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !standalone) return "install";
  if (!window.isSecureContext || !("Notification" in window) ||
      !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return Notification.permission === "denied" ? "blocked" : "available";
}

function decodeKey(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  } catch { return null; }
}

async function readyWorker() {
  if (!await registerServiceWorker()) throw new Error("Notifications couldn’t start. Reload the app and try again.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Setup took too long. Reload the app and try again.")), 10000);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

async function saveSubscription(subscription: PushSubscription) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()), signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(res.status === 401
    ? "Sign in again to connect notifications."
    : "Couldn’t connect this device. Check your connection and try again.");
}

export async function checkPushSubscription(): Promise<PushState> {
  const availability = getPushAvailability();
  if (availability !== "available") return availability;
  if (Notification.permission !== "granted") return "available";
  const registration = await readyWorker();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return "available";
  // Restore the server record on a new login; permission alone is not a subscription.
  await saveSubscription(subscription);
  return "active";
}

export async function subscribeToPush(vapidPublicKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const availability = getPushAvailability();
    if (availability === "install") throw new Error("Add Remidify to your Home Screen, then open it from its icon.");
    if (availability === "blocked") throw new Error("Allow notifications for Remidify in your device Settings, then return here.");
    if (availability !== "available") throw new Error("This browser doesn’t support notifications. On iPhone, use iOS 16.4 or later.");
    // Safari requires the permission request to follow a direct user gesture.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notifications weren’t allowed. You can enable them in device Settings.");
    const registration = await readyWorker();
    const key = decodeKey(vapidPublicKey);
    let subscription = await registration.pushManager.getSubscription();
    const oldKey = subscription?.options.applicationServerKey;
    if (subscription && oldKey && (oldKey.byteLength !== key.length ||
        !new Uint8Array(oldKey).every((byte, i) => byte === key[i]))) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await saveSubscription(subscription);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Couldn’t enable notifications. Try again." };
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return true;
    const response = await fetch("/api/push/unsubscribe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }), signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return false;
    return await subscription.unsubscribe();
  } catch { return false; }
}
