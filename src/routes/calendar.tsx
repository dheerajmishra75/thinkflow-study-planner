import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays, fromISO, toISO, today } from "@/lib/planner/dates";
import { PageHeader, SubjectDot } from "@/components/app/bits";
import { SessionItem } from "@/components/app/SessionItem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — ThinkFlow AI" }, { name: "description", content: "Month view of study sessions and exams." }, { property: "og:title", content: "Calendar — ThinkFlow AI" }, { property: "og:description", content: "Month view of study sessions and exams." }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { sessions, subjects } = useStore();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(today());
  const first = toISO(month);
  const offset = (month.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
  const daySessions = sessions.filter((s) => s.date === sel).sort((a, b) => a.start.localeCompare(b.start));
  const exams = subjects.filter((s) => s.examDate === sel);
  return (
    <div>
      <PageHeader eyebrow="Schedule" title="Calendar">
        <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></Button>
        <Button variant="outline" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSel(today()); }}>Today</Button>
        <Button variant="outline" size="icon" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></Button>
      </PageHeader>
      <h2 className="mb-3 text-lg font-medium">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-7 border-b text-center">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="eyebrow py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const ds = sessions.filter((s) => s.date === d && s.status !== "skipped");
              const ex = subjects.filter((s) => s.examDate === d);
              const inMonth = fromISO(d).getMonth() === month.getMonth();
              return (
                <button key={d} onClick={() => setSel(d)} className={cn("min-h-20 border-b border-r p-1.5 text-left text-xs transition-colors hover:bg-accent", !inMonth && "text-muted-foreground/50", sel === d && "bg-leaf-soft")}>
                  <div className={cn("tabular mb-1 inline-grid size-5 place-items-center rounded-full", d === today() && "bg-primary text-primary-foreground")}>{fromISO(d).getDate()}</div>
                  {ex.map((s) => <div key={s.id} className="mb-0.5 truncate rounded bg-warm-soft px-1 font-medium">Exam · {s.name}</div>)}
                  <div className="flex flex-wrap gap-0.5">{ds.slice(0, 6).map((s) => <SubjectDot key={s.id} color={subjects.find((x) => x.id === s.subjectId)?.color ?? 1} />)}</div>
                  {ds.length > 0 && <div className="mt-0.5 hidden text-muted-foreground sm:block">{ds.length} session{ds.length > 1 ? "s" : ""}</div>}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">{fromISO(sel).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h3>
          {exams.map((s) => <div key={s.id} className="mb-3 rounded-md border border-warm/40 bg-warm-soft px-3 py-2 text-sm font-medium">Exam: {s.name}</div>)}
          <div className="panel">{daySessions.length ? daySessions.map((s) => <SessionItem key={s.id} s={s} />) : <p className="p-4 text-sm text-muted-foreground">No sessions on this day.</p>}</div>
        </div>
      </div>
    </div>
  );
}
