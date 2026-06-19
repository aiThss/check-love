self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("lovecheck-shell-v1").then((cache) =>
      cache.addAll(["/", "/manifest.webmanifest", "/logo.svg"]).catch(() => undefined)
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open("lovecheck-runtime-v1").then((cache) => cache.put(request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() ?? {
    title: "LoveCheck",
    body: "Có check-in mới từ người ấy.",
    url: "/app/home"
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || "LoveCheck", {
      body: payload.body || "Có check-in mới.",
      icon: "/icon-192.png",
      badge: "/icon-96.png",
      data: { url: payload.url || "/app/home" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
