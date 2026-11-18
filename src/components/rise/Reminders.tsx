import { useEffect } from "react";
import { useRise } from "@/lib/store";
import { dayKey } from "@/lib/rise";
import { dueReminders, loadFired, loadReminders, saveFired, type Reminder } from "@/lib/reminders";

async function show(r: Reminder) {
  const options = { body: r.body, icon: "/rise-app-192.png", tag: r.key };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(r.title, options); return; }
  } catch { /* Fall back to a plain notification. */ }
  try { new Notification(r.title, options); } catch { /* Notifications are not available here. */ }
}

/**
 * Shows reminders while Rise is open or running in the background of the browser.
 * Without a server, browsers do not wake a closed app, so this is not a push service.
 */
export function ReminderRunner() {
  const { state } = useRise();
  useEffect(() => {
    const check = () => {
      try {
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        const now = new Date();
        const day = dayKey(now);
        const fired = loadFired(localStorage, day);
        const due = dueReminders(state, now, loadReminders(localStorage), fired);
        if (!due.length) return;
        for (const r of due) { fired.add(r.key); void show(r); }
        saveFired(localStorage, day, fired);
      } catch { /* Reminders are optional. */ }
    };
    check();
    const timer = setInterval(check, 30_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [state]);
  return null;
}
