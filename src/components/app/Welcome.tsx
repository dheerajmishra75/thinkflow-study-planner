import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function Welcome() {
  const loadDemo = useStore((s) => s.loadDemo);
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="flex flex-col justify-between p-8 lg:p-14">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded bg-primary text-[11px] font-bold text-primary-foreground">T</div>
          <span className="text-sm font-semibold">ThinkFlow <span className="text-warm">AI</span></span>
        </div>
        <div className="max-w-md py-16">
          <p className="eyebrow">Study planner for college students</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] lg:text-5xl">ThinkFlow AI</h1>
          <p className="mt-5 text-muted-foreground">Add your syllabus and exam dates. ThinkFlow builds a realistic daily plan that fits your hours, and adjusts it when you miss a session, struggle with a subject, or get ahead.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/onboarding">Set up my plan <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" onClick={loadDemo}>Explore with demo data</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Your account keeps your plan saved securely. Demo data stays in this browser.</p>
        </div>
        <p className="text-xs text-muted-foreground">Goals → Syllabus → Plan → Study → Track → Adapt</p>
      </div>
      <div className="hidden border-l bg-secondary p-14 lg:flex lg:items-center">
        <div className="w-full max-w-md space-y-2">
          {[["18:00", "DBMS", "1NF to BCNF", "Learn", "90m"], ["19:45", "Operating Systems", "Semaphores & mutex", "Revise", "30m"], ["20:30", "Mathematics III", "Distributions", "Problems", "45m"]].map(([t, s, topic, ty, d]) => (
            <div key={t} className="panel flex items-center gap-4 px-4 py-3">
              <span className="tabular w-12 text-xs text-muted-foreground">{t}</span>
              <div className="flex-1"><div className="text-sm font-medium">{topic}</div><div className="text-xs text-muted-foreground">{s} · {ty}</div></div>
              <span className="tabular text-xs text-muted-foreground">{d}</span>
            </div>
          ))}
          <div className="mt-4 border-l-2 border-warm pl-4 text-sm">
            <p className="font-medium">Missed yesterday's DBMS session</p>
            <p className="text-muted-foreground">Proposed for Thursday 18:00 — review before applying.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
