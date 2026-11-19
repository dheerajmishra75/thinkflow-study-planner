import { Check, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Adjustment } from "@/lib/planner/types";
import { Button } from "@/components/ui/button";

export function AdjustmentCard({ a }: { a: Adjustment }) {
  const apply = useStore((s) => s.applyAdjustment);
  const dismiss = useStore((s) => s.dismissAdjustment);
  const [more, setMore] = useState(false);
  const shown = more ? a.changes : a.changes.slice(0, 4);
  return (
    <div className="panel border-l-2 border-l-warm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Proposed change</p>
          <h3 className="mt-1 text-sm font-semibold">{a.title}</h3>
        </div>
        {a.status !== "proposed" && <span className="text-xs text-muted-foreground capitalize">{a.status}</span>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{a.reason}</p>
      {a.changes.length > 0 && (
        <ul className="tabular mt-3 space-y-1 font-mono text-xs">
          {shown.map((c, i) => <li key={i} className="text-muted-foreground">{c}</li>)}
          {a.changes.length > 4 && <li><button className="text-primary underline-offset-2 hover:underline" onClick={() => setMore(!more)}>{more ? "Show less" : `+${a.changes.length - 4} more`}</button></li>}
        </ul>
      )}
      {a.status === "proposed" && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => apply(a.id)}><Check />Apply</Button>
          <Button size="sm" variant="ghost" onClick={() => dismiss(a.id)}><X />Dismiss</Button>
        </div>
      )}
    </div>
  );
}
