import { useEffect } from "react";

/** Registers the offline helper in the published app (not in development). */
export function RegisterSW() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    const start = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((n) => n.startsWith(location.origin));
          reg.active?.postMessage({ type: "cache-urls", urls });
        })
        .catch(() => { /* The app still works online without it. */ });
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }, []);
  return null;
}
