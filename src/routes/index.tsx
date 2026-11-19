import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { addDays, daysBetween, fmtDuration, fromISO, today } from "@/lib/planner/dates";
import { dailyRecommendation, subjectCompletion } from "@/lib/planner/engine";
import { Bar, Section, SubjectDot } from "@/components/app/bits";
import { SessionItem } from "@/components/app/SessionItem";
import { SessionDialog } from "@/components/app/SessionDialog";
import { AdaptivePanel } from "@/components/app/AdaptivePanel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Dashboard — ThinkFlow AI" },
    { name: "description", content: "Today's study sessions, progress, exams and AI recommendations." },
    { property: "og:title", content: "Dashboard — ThinkFlow AI" },
    { property: "og:description", content: "Today's study sessions, progress, exams and AI recommendations." },
  ] }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { profile, subjects, sessions } = useStore();
  const [adding, setAdding] = useState(false);
  const now = today();
  const todays = sessions.filter((s) => s.date === now).sort((a, b) => a.start.localeCompare(b.start));
  const planned = todays.filter((s) => s.status !== "skipped").reduce((a, s) => a + s.duration, 0);
  const completed = todays.filter((s) => s.status === "done" || s.status === "partial").reduce((a, s) => a + (s.actualMinutes ?? s.duration), 0);
  const doneCount = todays.filter((s) => s.status === "done").length;
  const remaining = todays.filter((s) => s.status === "planned" || s.status === "in_progress").length;
  const rec = useMemo(() => dailyRecommendation(subjects, sessions, now), [subjects, sessions, now]);
  const exams = [...subjects].filter((s) => s.examDate >= now).sort((a, b) => a.examDate.localeCompare(b.examDate));

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 3);
    const ds = sessions.filter((s) => s.date === d && s.status !== "skipped");
    return { d, planned: ds.reduce((a, s) => a + s.duration, 0), done: ds.filter((s) => s.status === "done" || s.status === "partial").reduce((a, s) => a + (s.actualMinutes ?? s.duration), 0) };
  });
  const maxWeek = Math.max(60, ...week.map((w) => w.planned));

  return (
    <div>
      <div className="mb-10">
        <p className="eyebrow">{fromISO(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1.5 text-3xl font-semibold">{greeting()}, {profile?.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">Here is your learning plan for today.</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <Section title="Today's schedule" action={<Button size="sm" variant="ghost" onClick={() => setAdding(true)}><Plus />Add</Button>}>
            <div className="panel">
              {todays.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">No sessions today. <Link to="/plan" className="text-primary hover:underline">Open your plan</Link> or ask the assistant to fill it.</p>
                : todays.map((s) => <SessionItem key={s.id} s={s} />)}
            </div>
          </Section>

          <Section title="Adaptive suggestions">
            <AdaptivePanel limit={2} />
          </Section>

          <Section title="Weekly overview" action={<span className="text-xs text-muted-foreground">planned vs completed</span>}>
            <div className="panel flex h-40 items-end gap-3 px-5 pb-4 pt-6">
              {week.map((w) => (
                <div key={w.d} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full max-w-10 flex-1 items-end">
                    <div className="absolute bottom-0 w-full rounded-sm bg-muted" style={{ height: `${(w.planned / maxWeek) * 100}%` }} />
                    <div className="relative w-full rounded-sm bg-primary" style={{ height: `${(Math.min(w.done, w.planned || w.done) / maxWeek) * 100}%` }} />
                  </div>
                  <span className={w.d === now ? "text-xs font-semibold" : "text-xs text-muted-foreground"}>{fromISO(w.d).toLocaleDateString(undefined, { weekday: "short" })}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-8">
          <Section title="Daily progress">
            <div className="panel divide-y">
              <div className="p-4">
                <div className="flex items-baseline justify-between"><span className="tabular text-2xl font-semibold">{fmtDuration(completed)}</span><span className="text-xs text-muted-foreground">of {fmtDuration(planned)} planned</span></div>
                <Bar value={planned ? (completed / planned) * 100 : 0} className="mt-3" />
              </div>
              <div className="grid grid-cols-2 divide-x text-sm">
                <div className="p-4"><div className="tabular text-lg font-semibold">{doneCount}</div><div className="text-xs text-muted-foreground">Tasks done</div></div>
                <div className="p-4"><div className="tabular text-lg font-semibold">{remaining}</div><div className="text-xs text-muted-foreground">Remaining</div></div>
              </div>
            </div>
          </Section>

          <Section title="Today's recommendation">
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm font-medium leading-relaxed">{rec.text}</p>
              <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium">Reason · </span>{rec.reason}</p>
              <Link to="/assistant" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Ask the assistant <ArrowRight className="size-3" /></Link>
            </div>
          </Section>

          <Section title="Upcoming exams">
            <div className="panel divide-y">
              {exams.length === 0 && <p className="p-4 text-sm text-muted-foreground">No upcoming exams.</p>}
              {exams.map((s) => { const d = daysBetween(now, s.examDate); return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <SubjectDot color={s.color} />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm">{s.name}</div><div className="text-xs text-muted-foreground">{fromISO(s.examDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div></div>
                  <span className={`tabular text-sm font-medium ${d <= 7 ? "text-warm" : ""}`}>{d}d</span>
                </div>); })}
            </div>
          </Section>

          <Section title="Subject progress">
            <div className="space-y-3">
              {subjects.map((s) => { const c = subjectCompletion(s); return (
                <div key={s.id}>
                  <div className="mb-1 flex justify-between text-sm"><span className="truncate">{s.name}</span><span className="tabular text-muted-foreground">{c}%</span></div>
                  <Bar value={c} />
                </div>); })}
            </div>
          </Section>
        </aside>
      </div>
      {adding && <SessionDialog open onOpenChange={setAdding} />}
    </div>
  );
}
