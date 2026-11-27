// Service worker for drumhof.com/huiswerk: only shows push notifications (no offline caching).
// Sent by scripts/push/send.mjs (GitHub Actions, every 15 minutes). Payload: { title, body, url, tag }.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    wins.forEach(w => w.postMessage({ type: "drumhw-push", tag: d.tag || "" }));
    await self.registration.showNotification(d.title || "Drumhuiswerk", {
    body: d.body || "",
    icon: "/img/favicon-192.png",
    badge: "/img/favicon-192.png",
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || "/huiswerk/" }
    });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/huiswerk/", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) if (w.url.split("#")[0] === url && "focus" in w) { w.postMessage({ type: "drumhw-push" }); return w.focus(); }
    return self.clients.openWindow(url);
  })());
});
