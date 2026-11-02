import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, CalendarCheck, Home, Moon, Sparkles, Sun, Target, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const NAV = [
  { to: "/", label: "Today", icon: Home },
  { to: "/habits", label: "Habits", icon: CalendarCheck },
  { to: "/plans", label: "Plans", icon: Target },
  { to: "/dreams", label: "Dreams", icon: Sparkles },
  { to: "/analytics", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function safeTheme() { try { return localStorage.getItem("rise-theme"); } catch { return "light"; } }

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const d = safeTheme() === "dark";
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    window.addEventListener("rise-theme-change", sync);
    return () => window.removeEventListener("rise-theme-change", sync);
  }, []);
  const toggle = () => {
    const d = !document.documentElement.classList.contains("dark");
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try { localStorage.setItem("rise-theme", d ? "dark" : "light"); } catch { /* Theme still works without storage. */ }
    window.dispatchEvent(new Event("rise-theme-change"));
  };
  return (
    <Button variant="ghost" size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition hover:text-foreground"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar px-4 py-6 md:flex">
        <Link to="/" className="mb-10 flex items-center gap-2 px-2">
          <img src="/rise-icon.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-xl" />
          <span className="font-serif text-2xl font-semibold">Rise</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted-foreground">Grow a little every day</span>
          <ThemeToggle />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-5 py-3 backdrop-blur md:hidden">
        <span className="flex items-center gap-2">
          <img src="/rise-icon.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
          <span className="font-serif text-xl font-semibold">Rise</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="px-4 pb-28 pt-6 sm:px-6 md:ml-60 md:px-10 md:pb-12 md:pt-10">
        <div className="mx-auto min-w-0 max-w-6xl">
          <motion.div key={pathname} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{children}</motion.div>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[11px] text-muted-foreground data-[status=active]:text-primary"
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
