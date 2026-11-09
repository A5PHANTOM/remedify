self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Every push must display a notification, including empty or malformed payloads on iOS.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Use the visible fallback below. */ }
  event.waitUntil(self.registration.showNotification(data.title || "Remidify", {
    body: data.body || "A little nudge: you have a reminder due.",
    icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
    data: { url: data.url || "/", reminderId: data.reminderId || null },
    tag: data.tag || `remidify-${data.reminderId || "reminder"}`,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let target = new URL("/", self.location.origin);
  try {
    const requested = new URL(event.notification.data?.url || "/", self.location.origin);
    if (requested.origin === self.location.origin) target = requested;
  } catch { /* Open the home screen for an invalid URL. */ }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && "focus" in client) {
        try {
          const navigated = await client.navigate(target.href);
          if (navigated) return await navigated.focus();
        } catch { /* Fall back to opening a fresh app window. */ }
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
