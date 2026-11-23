import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "@/components/study/CloudWorkspace";
import { Button } from "@/components/ui/button";
import { Bell, BookOpen, CalendarDays, ChartLine, ClipboardCheck, LayoutGrid, ListChecks, Menu, MessageSquare, Moon, Settings, Sun, Timer, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Welcome } from "./Welcome";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TopicLearning } from "@/components/learning/TopicLearning";
import { NOTICE_LABELS, type Notice, type NoticeCategory } from "@/lib/planner/notices";
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
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/reset-password") || pathname.startsWith("/focus")) return <>{children}</>;
  if (!profile) return <Welcome />;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-60 border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <SidebarBody />
      </aside>
      {open && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</Button>
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
  const { sync } = useAccount();
  if (!demo) return <span className="text-xs text-muted-foreground">{sync}</span>;
  return <span className="rounded border border-warm/40 bg-warm-soft px-2 py-0.5 text-xs font-medium text-foreground">Demo data</span>;
}

function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" className="grid size-8 place-items-center rounded-md hover:bg-accent" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function Notifications() {
  const notices = useStore((s) => s.notices);
  const readNotice = useStore((s) => s.readNotice);
  const readNotices = useStore((s) => s.readNotices);
  const refreshNotices = useStore((s) => s.refreshNotices);
  const preferences = useStore((s) => s.noticePreferences);
  const setPreferences = useStore((s) => s.setNoticePreferences);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "exams" | "revisions" | "sessions">("all");
  const [showPreferences, setShowPreferences] = useState(false);
  const [learningTopic, setLearningTopic] = useState<string | null>(null);
  const unread = notices.filter((n) => !n.read).length;
  useEffect(() => {
    refreshNotices();
    const timer = window.setInterval(refreshNotices, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshNotices]);

  const visible = notices.filter((n) => {
    if (filter === "exams") return n.category === "exam";
    if (filter === "revisions") return n.category === "revision";
    if (filter === "sessions") return n.category === "session" || n.category === "missed";
    return true;
  });
  const openNotice = (notice: Notice) => {
    readNotice(notice.id);
    setOpen(false);
    if (notice.category === "revision" && notice.topicId) {
      setLearningTopic(notice.topicId);
    } else if (notice.target === "progress") {
      void navigate({ to: "/progress" });
    } else if (notice.category === "exam") {
      void navigate({ to: "/calendar" });
    } else if (notice.category === "session" || notice.category === "missed") {
      void navigate({ to: "/plan" });
    } else {
      void navigate({ to: "/subjects" });
    }
  };
  const togglePreference = (category: NoticeCategory, checked: boolean) => {
    setPreferences({ ...preferences, categories: { ...preferences.categories, [category]: checked } });
  };

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative grid size-8 place-items-center rounded-md hover:bg-accent">
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-warm px-1 text-[10px] font-semibold leading-none text-white">{unread > 99 ? "99+" : unread}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div><h2 className="text-sm font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</p></div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={!unread} onClick={readNotices}>Mark all as read</Button>
            <Button size="icon" variant={showPreferences ? "secondary" : "ghost"} aria-label="Notification preferences" onClick={() => setShowPreferences(!showPreferences)}><Settings className="size-4" /></Button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b px-3 py-2" role="tablist" aria-label="Filter notifications">
          {([["all", "All"], ["exams", "Exams"], ["revisions", "Revisions"], ["sessions", "Sessions"]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors", filter === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{label}</button>
          ))}
        </div>
        {showPreferences && <div className="space-y-3 border-b bg-muted/30 px-4 py-3">
          {([
            ["exam", "Exam countdowns"],
            ["session", "30-minute session reminders"],
            ["missed", "Missed sessions"],
          ] as const).map(([category, label]) => (
            <label key={category} className="flex items-center justify-between gap-3 text-sm">
              <span>{label}</span>
              <Switch checked={preferences.categories[category]} onCheckedChange={(checked) => togglePreference(category, checked)} aria-label={label} />
            </label>
          ))}
          <Link to="/settings" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">More notification settings</Link>
        </div>}
        <div className="max-h-[min(60vh,24rem)] overflow-y-auto">
          {visible.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">{notices.length ? "No notifications in this category." : "Nothing yet. We'll let you know when there's something to review."}</p>}
          {visible.map((n) => {
            const Icon = n.category === "exam" ? CalendarDays : n.category === "revision" ? BookOpen : n.category === "progress" ? ChartLine : n.category === "assessment" ? ClipboardCheck : Timer;
            const title = n.title ?? (n.category ? NOTICE_LABELS[n.category] : "Study update");
            return <article key={n.id} className={cn("border-b px-4 py-3 last:border-0", !n.read && "bg-primary/[0.03]")}>
              <div className="flex gap-3">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}><Icon className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-medium">{title}</h3>{!n.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.description ?? n.text}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{new Date(n.at).toLocaleString()}</p>
                  <div className="mt-2 flex gap-3">
                    <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => openNotice(n)}>{n.category === "revision" ? "Open topic" : n.category === "exam" ? "View calendar" : n.target === "progress" ? "View progress" : "Open study plan"}</button>
                    {!n.read && <button type="button" className="text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => readNotice(n.id)}>Mark as read</button>}
                  </div>
                </div>
              </div>
            </article>;
          })}
        </div>
      </PopoverContent>
    </Popover>
    <Dialog open={learningTopic !== null} onOpenChange={(isOpen) => !isOpen && setLearningTopic(null)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="sr-only"><DialogTitle>Revision topic</DialogTitle></DialogHeader>
        {learningTopic && <TopicLearning topicId={learningTopic} initialTab="notes" onClose={() => setLearningTopic(null)} />}
      </DialogContent>
    </Dialog>
    </>
  );
}
