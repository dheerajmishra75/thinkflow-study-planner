import { createFileRoute, Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { findTopic, useStore } from "@/lib/store";
import { fmtDuration, fromISO, today } from "@/lib/planner/dates";
import { STUDY_TYPE_LABEL } from "@/lib/planner/types";
import { PageHeader, Section, StatusPill, SubjectDot } from "@/components/app/bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [{ title: "Study Sessions — ThinkFlow AI" }, { name: "description", content: "Start focus sessions and review your study log." }, { property: "og:title", content: "Study Sessions — ThinkFlow AI" }, { property: "og:description", content: "Start focus sessions and review your study log." }] }),
  component: Sessions,
});

function Sessions() {
  const { sessions, subjects } = useStore();
  const now = today();
  const next = sessions.filter((s) => (s.status === "planned" || s.status === "in_progress") && s.date >= now).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 5);
  const log = sessions.filter((s) => s.status === "done" || s.status === "partial").sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  return (
    <div>
      <PageHeader eyebrow="Focus" title="Study Sessions" sub="Start a planned session in distraction-free mode. Your feedback afterwards shapes the next plan." />
      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Up next">
          <div className="panel divide-y">
            {next.length === 0 && <p className="p-4 text-sm text-muted-foreground">No upcoming sessions.</p>}
            {next.map((s) => { const sub = subjects.find((x) => x.id === s.subjectId); return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                {sub && <SubjectDot color={sub.color} />}
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{s.title}</div><div className="text-xs text-muted-foreground">{fromISO(s.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })} {s.start} · {fmtDuration(s.duration)} · {STUDY_TYPE_LABEL[s.type]}</div></div>
                <Button size="sm" asChild><Link to="/focus/$sessionId" params={{ sessionId: s.id }}><Play />Start</Link></Button>
              </div>); })}
          </div>
        </Section>
        <Section title={`Session log (${log.length})`}>
          <div className="panel divide-y">
            {log.length === 0 && <p className="p-4 text-sm text-muted-foreground">Completed sessions appear here.</p>}
            {log.map((s) => { const ref = findTopic(subjects, s.topicId); return (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center gap-2"><span className="flex-1 truncate text-sm font-medium">{s.title}</span><StatusPill s={s.status} /></div>
                <div className="mt-0.5 text-xs text-muted-foreground">{ref?.subject.name} · {s.date} · {fmtDuration(s.actualMinutes ?? s.duration)} of {fmtDuration(s.duration)}{s.feedback && ` · difficulty ${s.feedback.difficulty}/5 · confidence ${s.feedback.confidence}/5`}</div>
                {s.notes && <p className="mt-1.5 border-l-2 pl-2 text-xs">{s.notes}</p>}
              </div>); })}
          </div>
        </Section>
      </div>
    </div>
  );
}
