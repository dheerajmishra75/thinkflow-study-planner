import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, BookOpen, CalendarDays, ChartLine, LayoutGrid, ListChecks, Menu, MessageSquare, Moon, Settings, Sun, Timer, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Welcome } from "./Welcome";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/plan", label: "My Study Plan", icon: ListChecks },
  { to: "/subjects", label: "Subjects & Syllabus", icon: BookOpen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/sessions", label: "Study Sessions", icon: Timer },
  { to: "/progress", label: "Progress", icon: ChartLine },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    void Promise.resolve(useStore.persist.rehydrate()).finally(() => setHydrated(true));
  }, []);
  const profile = useStore((s) => s.profile);
  const theme = useStore((s) => s.theme);
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  useEffect(() => setOpen(false), [pathname]);

  if (!hydrated) return <div className="min-h-screen bg-background" />;
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/focus")) return <>{children}</>;
  if (!profile) return <Welcome />;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-60 border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <SidebarBody />
      </aside>
      {open && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          <div className="flex-1" />
          <DemoBadge />
          <Notifications />
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody() {
  const { pathname } = useLocation();
  const profile = useStore((s) => s.profile);
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="grid size-6 place-items-center rounded bg-primary text-[11px] font-bold text-primary-foreground">T</div>
        <span className="text-sm font-semibold tracking-tight">ThinkFlow</span>
        <span className="text-xs text-warm">AI</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link key={to} to={to} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors", active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
              <Icon className="size-4" strokeWidth={1.75} />{label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-5 py-4 text-xs">
        <div className="font-medium">{profile?.name}</div>
        <div className="text-muted-foreground">{profile?.branch} · Sem {profile?.semester}</div>
      </div>
    </div>
  );
}

function DemoBadge() {
  const demo = useStore((s) => s.demo);
  if (!demo) return null;
  return <span className="rounded border border-warm/40 bg-warm-soft px-2 py-0.5 text-xs font-medium text-foreground">Demo data</span>;
}

function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  return (
    <button aria-label="Toggle theme" className="grid size-8 place-items-center rounded-md hover:bg-accent" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function Notifications() {
  const notices = useStore((s) => s.notices);
  const read = useStore((s) => s.readNotices);
  const unread = notices.filter((n) => !n.read).length;
  return (
    <Popover onOpenChange={(o) => !o && read()}>
      <PopoverTrigger aria-label="Notifications" className="relative grid size-8 place-items-center rounded-md hover:bg-accent">
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-warm" />}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-2.5 text-sm font-medium">Notifications</div>
        <div className="max-h-80 overflow-auto">
          {notices.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>}
          {notices.map((n) => (
            <div key={n.id} className="border-b px-4 py-2.5 text-sm last:border-0">
              <p className={cn(!n.read && "font-medium")}>{n.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{new Date(n.at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
