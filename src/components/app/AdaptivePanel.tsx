import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { today } from "@/lib/planner/dates";
import { proposeAhead, proposeExamMode, proposeMissedReschedule, proposeWeakSubjectBoost } from "@/lib/planner/engine";
import type { Adjustment } from "@/lib/planner/types";
import { Button } from "@/components/ui/button";
import { AdjustmentCard } from "./AdjustmentCard";

/** Detects the four adaptive scenarios and shows them as proposals. Nothing changes until the student applies one. */
export function AdaptivePanel({ limit }: { limit?: number }) {
  const { subjects, profile, sessions, adjustments } = useStore();
  const propose = useStore((s) => s.propose);
  const apply = useStore((s) => s.applyAdjustment);
  const dismiss = useStore((s) => s.dismissAdjustment);
  const now = today();
  const handled = new Set(adjustments.filter((a) => a.createdAt === now && a.status !== "proposed").map((a) => a.kind));
  const list = useMemo(() => {
    if (!profile) return [];
    return [proposeMissedReschedule, proposeExamMode, proposeWeakSubjectBoost, proposeAhead]
      .map((f) => f(subjects, profile, sessions, now))
      .filter((a): a is Adjustment => !!a);
  }, [subjects, profile, sessions, now]);
  const visible = list.filter((a) => !handled.has(a.kind)).slice(0, limit);
  const stored = adjustments.filter((a) => a.status === "proposed");

  if (!visible.length && !stored.length) return <p className="panel px-4 py-5 text-sm text-muted-foreground">Your plan is on track. No adjustments needed right now.</p>;
  return (
    <div className="space-y-3">
      {stored.map((a) => <AdjustmentCard key={a.id} a={a} />)}
      {visible.map((a) => (
        <div key={a.kind} className="panel border-l-2 border-l-warm p-4">
          <p className="eyebrow">Adaptive suggestion</p>
          <h3 className="mt-1 text-sm font-semibold">{a.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{a.reason}</p>
          <ul className="tabular mt-3 space-y-1 font-mono text-xs text-muted-foreground">
            {a.changes.slice(0, 4).map((c, i) => <li key={i}>{c}</li>)}
            {a.changes.length > 4 && <li>+{a.changes.length - 4} more</li>}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => { propose(a); apply(a.id); }}><Check />Apply</Button>
            <Button size="sm" variant="ghost" onClick={() => { propose(a); dismiss(a.id); }}><X />Not now</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
