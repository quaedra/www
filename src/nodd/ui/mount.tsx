import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { url } from "../common";

/** Render a page into #root. Every page is its own HTML entry, so deep links work on static hosting. */
export function mount(page: ReactNode) {
  createRoot(document.getElementById("root")!).render(page);
  // app-shell cache so pages reload offline after one online visit (public/sw.js)
  if ("serviceWorker" in navigator && !import.meta.env.DEV) void navigator.serviceWorker.register(url("sw.js"));
}
