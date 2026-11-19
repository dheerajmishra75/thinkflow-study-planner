import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { findTopic, useStore } from "@/lib/store";
import { pad } from "@/lib/planner/dates";
import { STUDY_TYPE_LABEL } from "@/lib/planner/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/focus/$sessionId")({
  head: () => ({ meta: [{ title: "Focus session — ThinkFlow AI" }, { name: "description", content: "Distraction-free study timer." }, { property: "og:title", content: "Focus session — ThinkFlow AI" }, { property: "og:description", content: "Distraction-free study timer." }] }),
  component: Focus,
});

function Scale({ value, onChange, labels }: { value: number; onChange: (n: number) => void; labels: [string, string] }) {
  return (
    <div>
      <div className="flex gap-1.5">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => onChange(n)} className={cn("tabular h-9 flex-1 rounded-md border text-sm", value === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>{n}</button>)}</div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{labels[0]}</span><span>{labels[1]}</span></div>
    </div>
  );
}

function Focus() {
  const { sessionId } = Route.useParams();
  const { sessions, subjects } = useStore();
  const setStatus = useStore((s) => s.setStatus);
  const finish = useStore((s) => s.finishSession);
  const navigate = useNavigate();
  const s = sessions.find((x) => x.id === sessionId);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [notes, setNotes] = useState(s?.notes ?? "");
  const [stage, setStage] = useState<"timer" | "review">("timer");
  const [partial, setPartial] = useState(false);
  const [fb, setFb] = useState({ completedTopic: true, difficulty: 3, confidence: 3, needsRevision: false });

  useEffect(() => { if (s && s.status === "planned") setStatus(s.id, "in_progress"); }, [s?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!running || stage !== "timer") return; const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, [running, stage]);

  if (!s) return <div className="grid min-h-screen place-items-center"><Link to="/plan" className="text-primary">Session not found — back to plan</Link></div>;
  const ref = findTopic(subjects, s.topicId);
  const total = s.duration * 60;
  const left = total - elapsed;
  const over = left < 0;
  const abs = Math.abs(left);
  const pct = Math.min(100, (elapsed / total) * 100);

  const save = () => {
    finish(s.id, { actualMinutes: Math.max(1, Math.round(elapsed / 60)), notes, partial, feedback: partial ? { ...fb, completedTopic: false } : fb });
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Exit</Link>
        <span className="eyebrow">{STUDY_TYPE_LABEL[s.type]}</span>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 pb-16">
        {stage === "timer" ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{ref?.subject.name} · {ref?.chapter.name}</p>
            <h1 className="mt-2 text-3xl font-semibold">{s.title}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{s.description}</p>
            <div className={cn("tabular mt-12 font-mono text-7xl font-medium tracking-tight", over && "text-warm")}>{over && "+"}{pad(Math.floor(abs / 60))}:{pad(abs % 60)}</div>
            <div className="mx-auto mt-6 h-1 max-w-sm overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
            {over && <p className="mt-3 text-xs text-warm">Planned time is up — finish when you're ready.</p>}
            <div className="mt-10 flex justify-center gap-3">
              <Button variant="outline" size="lg" onClick={() => setRunning(!running)}>{running ? <><Pause />Pause</> : <><Play />Resume</>}</Button>
              <Button variant="outline" size="lg" onClick={() => { setPartial(true); setFb({ ...fb, completedTopic: false }); setStage("review"); }}>Partially done</Button>
              <Button size="lg" onClick={() => { setPartial(false); setStage("review"); }}>Complete</Button>
            </div>
            <div className="mt-10 text-left"><Label>Notes</Label><Textarea className="mt-1.5" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key points, doubts to clear later…" /></div>
          </div>
        ) : (
          <div>
            <p className="eyebrow">Session review · {Math.max(1, Math.round(elapsed / 60))} min</p>
            <h1 className="mt-2 text-2xl font-semibold">How did {s.title} go?</h1>
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between"><Label>Did you complete the topic?</Label><Switch checked={fb.completedTopic} onCheckedChange={(v) => setFb({ ...fb, completedTopic: v })} disabled={partial} /></div>
              <div><Label className="mb-2 block">How difficult was it?</Label><Scale value={fb.difficulty} onChange={(n) => setFb({ ...fb, difficulty: n })} labels={["Easy", "Very hard"]} /></div>
              <div><Label className="mb-2 block">How confident are you?</Label><Scale value={fb.confidence} onChange={(n) => setFb({ ...fb, confidence: n })} labels={["Not at all", "Very"]} /></div>
              <div className="flex items-center justify-between"><Label>Do you need revision?</Label><Switch checked={fb.needsRevision} onCheckedChange={(v) => setFb({ ...fb, needsRevision: v })} /></div>
              <div><Label>Notes</Label><Textarea className="mt-1.5" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <div className="mt-8 flex gap-3"><Button variant="ghost" onClick={() => setStage("timer")}>Back to timer</Button><Button className="flex-1" onClick={save}>Save session</Button></div>
          </div>
        )}
      </main>
    </div>
  );
}
