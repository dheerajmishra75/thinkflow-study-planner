import { cn } from "@/lib/utils";
import type { Priority, SessionStatus } from "@/lib/planner/types";

export const subjectColor = (i: number) => `var(--chart-${((i - 1) % 5) + 1})`;

export function SubjectDot({ color, className }: { color: number; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: subjectColor(color) }} />;
}

export function PriorityMark({ p }: { p: Priority }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", p === "high" ? "text-warm" : "text-muted-foreground")}>
      <span className="flex gap-px">{[0, 1, 2].map((i) => <span key={i} className={cn("h-2.5 w-[3px] rounded-sm", i < (p === "high" ? 3 : p === "medium" ? 2 : 1) ? "bg-current" : "bg-border")} />)}</span>
      <span className="capitalize">{p}</span>
    </span>
  );
}

const STATUS: Record<SessionStatus | "overdue", { label: string; cls: string }> = {
  planned: { label: "Upcoming", cls: "text-muted-foreground border-border" },
  in_progress: { label: "In progress", cls: "text-primary border-primary/40" },
  done: { label: "Done", cls: "text-primary border-primary/30 bg-leaf-soft" },
  partial: { label: "Partial", cls: "text-foreground border-warm/40 bg-warm-soft" },
  missed: { label: "Missed", cls: "text-destructive border-destructive/30" },
  skipped: { label: "Skipped", cls: "text-muted-foreground border-border line-through" },
  overdue: { label: "Overdue", cls: "text-destructive border-destructive/30" },
};
export function StatusPill({ s }: { s: SessionStatus | "overdue" }) {
  const v = STATUS[s];
  return <span className={cn("rounded border px-1.5 py-px text-[11px] font-medium", v.cls)}>{v.label}</span>;
}

export function Bar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "warm" }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all", tone === "warm" ? "bg-warm" : "bg-primary")} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, children }: { eyebrow?: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">{title}</h2>{action}</div>
      {children}
    </section>
  );
}
