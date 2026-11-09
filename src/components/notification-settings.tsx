"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, Check, ChevronRight, Loader2, Send, Share, Smartphone } from "lucide-react";
import { checkPushSubscription, getPushAvailability, subscribeToPush, unsubscribeFromPush, type PushState } from "@/lib/push-client";

export function NotificationSettings({ compact = false, onOpen }: { compact?: boolean; onOpen?: () => void }) {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const refresh = useCallback(async () => {
    try { setState(await checkPushSubscription()); }
    catch { setState("error"); }
  }, []);

  useEffect(() => {
    void refresh();
    const controller = new AbortController();
    fetch("/api/push/config", { signal: controller.signal }).then(async (res) => {
      if (res.ok) setPublicKey((await res.json()).publicKey);
    }).catch(() => {});
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", refresh);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  const enable = async () => {
    setBusy(true);
    setMessage(null);
    const result = await subscribeToPush(publicKey);
    setState(result.success ? "active" : getPushAvailability());
    setMessage({ text: result.success ? "This device is connected. Send a test to check your lock screen." : result.error!, error: !result.success });
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) { setState("available"); throw new Error("Reconnect this device to send a test."); }
      const res = await fetch("/api/push/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }), signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();
      if (!res.ok || data.sent < 1) {
        if (res.status === 410 || res.status === 404) setState("available");
        throw new Error(data.error || "The test couldn’t be sent. Try reconnecting this device.");
      }
      setMessage({ text: "Test sent to this device. Check Notification Centre; Focus and notification settings can silence alerts." });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Couldn’t send the test. Try again.", error: true });
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    const success = await unsubscribeFromPush();
    if (success) setState("available");
    setMessage({ text: success ? "Notifications are off on this device." : "Couldn’t disconnect. Please try again.", error: !success });
    setBusy(false);
  };

  if (compact) return (
    <button className={`notification-nudge ${state === "active" ? "connected" : ""}`} onClick={onOpen}>
      <span className="nudge-icon">{state === "active" ? <BellRing size={18} /> : <Bell size={18} />}</span>
      <span><strong>{state === "active" ? "You’re connected" : "A little nudge, right on time"}</strong>
        <small>{state === "active" ? "Notifications enabled on this device" : "Set up reminders on your lock screen"}</small></span>
      <ChevronRight size={17} />
    </button>
  );

  const labels: Record<PushState, string> = { checking: "Checking", install: "Setup needed", unsupported: "Unavailable", blocked: "Blocked", available: "Off", active: "Connected", error: "Reconnect" };
  return (
    <section className="settings-card notification-card" aria-labelledby="notifications-heading">
      <div className="section-heading"><span className="settings-icon violet"><BellRing size={20} /></span>
        <h2 id="notifications-heading">Notifications</h2><span className={`status-pill ${state === "active" ? "success" : ""}`}>{labels[state]}</span></div>
      <p>Keep your day on track, even when the app is closed.</p>
      {state === "install" ? (
        <div className="install-guide">
          <h3><Smartphone size={16} /> Make room on your Home Screen</h3>
          <ol><li><span>1</span>Open Remidify in Safari and tap Share <Share size={15} />.</li>
            <li><span>2</span>Choose “Add to Home Screen” (under More if needed), then Add.</li>
            <li><span>3</span>Open the new icon, return here and enable notifications.</li></ol>
          <small>Available on iPhone with iOS 16.4 or later.</small>
        </div>
      ) : state === "blocked" ? (
        <p className="inline-notice">Open iPhone Settings → Notifications → Remidify and turn on Allow Notifications. Return here to reconnect.</p>
      ) : state === "unsupported" ? (
        <p className="inline-notice">Use an up-to-date browser over HTTPS. On iPhone, install the app from Safari on iOS 16.4 or later.</p>
      ) : state === "active" ? (
        <><button className="primary-button" disabled={busy} onClick={test}>{busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={17} />} Send a test notification</button>
          <button className="text-button" onClick={disable} disabled={busy}>Turn off on this device</button></>
      ) : (
        <button className="primary-button" disabled={busy || state === "checking" || !publicKey} onClick={enable}>
          {busy || state === "checking" ? <Loader2 className="animate-spin" size={18} /> : <Bell size={18} />}
          {busy ? "Connecting…" : "Enable notifications"}
        </button>
      )}
      {!publicKey && !["checking", "install", "unsupported", "blocked", "active"].includes(state) && <p className="inline-notice">Notification setup is unavailable. Reload the app or try again shortly.</p>}
      {message && <p role="status" className={`inline-notice ${message.error ? "error" : "success"}`}>{!message.error && <Check size={16} />}{message.text}</p>}
    </section>
  );
}
