// Web push helpers shared by the student page (index.html) and the teacher page (leraar.html).
// The browser gives a "subscription" (endpoint + keys); we store it in Firestore and
// scripts/push/send.mjs (GitHub Actions) uses it to send notifications.
import { VAPID_PUBLIC } from "./push-config.js";

export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const pushSupported = () =>
  !!(VAPID_PUBLIC && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
// iPhone: push only works from the home-screen app (iOS 16.4+)
export const needsHomeScreen = () => !!VAPID_PUBLIC && isIOS && !isStandalone;

const keyBytes = b64 => {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - b64.length % 4) % 4));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};

async function registration() {
  await navigator.serviceWorker.register("sw.js");
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

// Asks permission (must be called from a tap/click) and returns the subscription
export async function subscribe() {
  if (!pushSupported()) throw new Error("unsupported");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("denied");
  const reg = await registration();
  return (await reg.pushManager.getSubscription()) ||
    reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) });
}

export async function unsubscribe() {
  const sub = await currentSubscription();
  if (sub) await sub.unsubscribe();
  return sub;
}

// Stable document id per device (same browser = same id, so turning it on again overwrites)
export async function deviceId(sub) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sub.endpoint));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

export function subData(sub) {
  const j = sub.toJSON();
  return { endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } };
}
