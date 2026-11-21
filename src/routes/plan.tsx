import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { validateSchedule } from "@/lib/planner/validation";
import { useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays, fromISO, today } from "@/lib/planner/dates";
import { PageHeader } from "@/components/app/bits";
import { SessionItem, sessionState, nextSlot } from "@/components/app/SessionItem";
import { SessionDialog } from "@/components/app/SessionDialog";
import { AdjustmentCard } from "@/components/app/AdjustmentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const meta = (t: string, d: string) => ({ meta: [{ title: `${t} — ThinkFlow AI` }, { name: "description", content: d }, { property: "og:title", content: `${t} — ThinkFlow AI` }, { property: "og:description", content: d }] });
export const Route = createFileRoute("/plan")({ head: () => meta("My Study Plan", "Plan, filter and reschedule your study sessions."), component: Plan });

function Plan() {
  const { sessions, subjects, adjustments, profile } = useStore();
  const upsert = useStore((s) => s.upsertSession);
  const regenerate = useStore((s) => s.regenerate);
  const propose = useStore((s) => s.propose);
  const [view, setView] = useState("week");
  const [q, setQ] = useState("");
  const [subj, setSubj] = useState("all");
  const [status, setStatus] = useState("all");
  const [adding, setAdding] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const now = today();

  const filtered = useMemo(() => sessions.filter((s) => {
    if (view === "today" && s.date !== now) return false;
    if (view === "week" && (s.date < now || s.date > addDays(now, 6))) return false;
    if (subj !== "all" && s.subjectId !== subj) return false;
    if (status !== "all" && sessionState(s) !== status) return false;
    if (q && !s.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)), [sessions, view, subj, status, q, now]);

  const days = view === "all" ? [...new Set(filtered.map((s) => s.date))] : view === "today" ? [now] : Array.from({ length: 7 }, (_, i) => addDays(now, i));
  const pending = adjustments.filter((a) => a.status === "proposed");

  const drop = (date: string, id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s || s.date === date) return;
    if (!profile) return;
    const moved = { ...s, date, start: nextSlot(sessions.filter(x => x.id !== id), date, s.start) };
    const error = validateSchedule([moved], sessions.filter(x => x.id !== id), profile, subjects);
    if (error) { toast.error(error); return; }
    upsert(moved);
  };

  return (
    <div>
      <PageHeader eyebrow="Workspace" title="My Study Plan" sub={`${profile?.hoursPerDay}h per day · up to ${profile?.maxSessionsPerDay} sessions`}>
        <Button variant="outline" onClick={() => propose(regenerate())}><RefreshCw />Regenerate plan</Button>
        <Button onClick={() => setAdding(now)}><Plus />Add session</Button>
      </PageHeader>
      {pending.length > 0 && <div className="mb-6 space-y-3">{pending.map((a) => <AdjustmentCard key={a.id} a={a} />)}</div>}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={setView}><TabsList><TabsTrigger value="today">Today</TabsTrigger><TabsTrigger value="week">This Week</TabsTrigger><TabsTrigger value="all">All Tasks</TabsTrigger></TabsList></Tabs>
        <div className="relative min-w-48 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search topics" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={subj} onValueChange={setSubj}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{([["all", "Any status"], ["planned", "Upcoming"], ["overdue", "Overdue"], ["done", "Done"], ["partial", "Partial"], ["missed", "Missed"], ["skipped", "Skipped"]] as const).map(([v, l]) => <SelectItem key={v} value={v ?? "all"}>{l}</SelectItem>)}</SelectContent></Select>
      </div>
      {view !== "all" && <div className="mb-3" />}
      <div className="space-y-6">
        {days.map((d) => {
          const list = filtered.filter((s) => s.date === d);
          return (
            <div key={d} onDragOver={(e) => { e.preventDefault(); setOver(d); }} onDragLeave={() => setOver(null)} onDrop={(e) => { setOver(null); drop(d, e.dataTransfer.getData("text/session")); }}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className={cn("text-sm font-medium", d === now && "text-primary")}>{fromISO(d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h3>
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setAdding(d)}>+ Add</button>
              </div>
              <div className={cn("panel min-h-12 transition-colors", over === d && "border-primary bg-leaf-soft")}>
                {list.length ? list.map((s) => <SessionItem key={s.id} s={s} draggable showDate={view === "all"} />) : <p className="px-4 py-3 text-xs text-muted-foreground">Nothing planned.</p>}
              </div>
            </div>
          );
        })}
        {view === "all" && !filtered.length && <p className="text-sm text-muted-foreground">No sessions match these filters.</p>}
      </div>
      {adding && <SessionDialog open onOpenChange={(o) => !o && setAdding(null)} defaultDate={adding} />}
    </div>
  );
}
