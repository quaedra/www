// Demo app-shell service worker: network first, cache fallback, so the demo (page, JS, worker,
// onnxruntime wasm, model index/configs) reloads offline after one online visit. Large model
// weights are cached by the library itself (Cache API "nodd-models-v1" / transformers.js
// "transformers-cache"), so they're skipped here to avoid storing them twice.
const CACHE = "nodd-demo-shell-v4";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const weights = /\.(onnx|onnx_data)$/.test(url.pathname);
  if (e.request.method !== "GET" || url.origin !== location.origin || weights) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(e.request);
        if (res.ok) await cache.put(e.request, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(e.request, { ignoreVary: true, ignoreSearch: url.pathname.endsWith(".html") || url.pathname.endsWith("/") });
        if (hit) return hit;
        throw err;
      }
    })(),
  );
});
