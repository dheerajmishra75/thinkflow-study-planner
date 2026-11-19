import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, Check, MoreHorizontal, Pencil, Play, SkipForward, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { findTopic, useStore } from "@/lib/store";
import { fmtDuration, today, toMin, fromMin } from "@/lib/planner/dates";
import { STUDY_TYPE_LABEL, type StudySession } from "@/lib/planner/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PriorityMark, StatusPill, SubjectDot } from "./bits";
import { SessionDialog } from "./SessionDialog";
import { cn } from "@/lib/utils";

export function sessionState(s: StudySession) {
  if (s.status === "planned" && (s.date < today() || (s.date === today() && toMin(s.start) + s.duration < new Date().getHours() * 60 + new Date().getMinutes()))) return "overdue" as const;
  return s.status;
}

export function SessionItem({ s, showDate, draggable }: { s: StudySession; showDate?: boolean; draggable?: boolean }) {
  const subjects = useStore((st) => st.subjects);
  const setStatus = useStore((st) => st.setStatus);
  const del = useStore((st) => st.deleteSession);
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const [resched, setResched] = useState(false);
  const ref = findTopic(subjects, s.topicId);
  const subject = ref?.subject ?? subjects.find((x) => x.id === s.subjectId);
  const state = sessionState(s);
  const active = s.status === "planned" || s.status === "in_progress";

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/session", s.id)}
      className={cn("group flex items-center gap-4 border-b px-4 py-3 last:border-0", draggable && "cursor-grab", (s.status === "done" || s.status === "skipped") && "opacity-60")}
    >
      <div className="tabular w-14 shrink-0 text-xs text-muted-foreground">
        {showDate && <div className="text-foreground">{new Date(s.date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>}
        <div>{s.start}</div>
        <div>{fmtDuration(s.duration)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {subject && <SubjectDot color={subject.color} />}
          <span className="truncate text-sm font-medium">{s.title}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{subject?.name ?? "Unknown subject"}</span>
          <span>{STUDY_TYPE_LABEL[s.type]}</span>
          <PriorityMark p={s.priority} />
        </div>
      </div>
      <StatusPill s={state} />
      <div className="flex items-center gap-1">
        {active && (
          <Button size="sm" variant="ghost" aria-label="Start session" onClick={() => navigate({ to: "/focus/$sessionId", params: { sessionId: s.id } })}>
            <Play className="size-3.5" /><span className="hidden sm:inline">Start</span>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8" aria-label="Session actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {active && <DropdownMenuItem onClick={() => { setStatus(s.id, "done"); toast.success("Marked complete"); }}><Check />Mark complete</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => setResched(true)}><CalendarClock />Reschedule</DropdownMenuItem>
            {active && <DropdownMenuItem onClick={() => { setStatus(s.id, "skipped"); toast("Session skipped"); }}><SkipForward />Skip</DropdownMenuItem>}
            {s.status === "skipped" || s.status === "missed" ? <DropdownMenuItem onClick={() => setStatus(s.id, "planned")}><Play />Restore</DropdownMenuItem> : null}
            <DropdownMenuItem onClick={() => setEdit(true)}><Pencil />Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => { del(s.id); toast("Session deleted"); }}><Trash2 />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {edit && <SessionDialog open onOpenChange={setEdit} session={s} />}
      {resched && <SessionDialog open onOpenChange={setResched} session={s} rescheduleOnly />}
    </div>
  );
}

export const nextSlot = (sessions: StudySession[], date: string, fallback: string) => {
  const day = sessions.filter((x) => x.date === date);
  const end = day.reduce((a, x) => Math.max(a, toMin(x.start) + x.duration + 15), toMin(fallback));
  return fromMin(Math.min(end, 22 * 60));
};
