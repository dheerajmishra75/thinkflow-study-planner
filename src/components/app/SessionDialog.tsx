import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { validateSchedule } from "@/lib/planner/validation";
import { today, uid } from "@/lib/planner/dates";
import { STUDY_TYPE_LABEL, type Priority, type StudySession, type StudyType } from "@/lib/planner/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SessionDialog({ open, onOpenChange, session, rescheduleOnly, defaultDate }: { open: boolean; onOpenChange: (o: boolean) => void; session?: StudySession; rescheduleOnly?: boolean; defaultDate?: string }) {
  const subjects = useStore((s) => s.subjects);
  const upsert = useStore((s) => s.upsertSession);
  const [f, setF] = useState<StudySession>(() => session ?? {
    id: uid(), subjectId: subjects[0]?.id ?? "", topicId: subjects[0]?.chapters[0]?.topics[0]?.id ?? "", title: "", description: "",
    date: defaultDate ?? today(), start: "18:00", duration: 60, priority: "medium", type: "learn", status: "planned",
  });
  const [err, setErr] = useState("");
  const subj = subjects.find((s) => s.id === f.subjectId);
  const topics = subj?.chapters.flatMap((c) => c.topics) ?? [];

  const save = () => {
    if (!f.subjectId || !f.topicId) return setErr("Choose a subject and topic.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return setErr("Pick a valid date.");
    if (!/^\d{2}:\d{2}$/.test(f.start)) return setErr("Pick a valid start time.");
    if (f.duration < 10 || f.duration > 240) return setErr("Duration must be between 10 and 240 minutes.");
    const title = f.title.trim() || topics.find((t) => t.id === f.topicId)?.name || "Study session";
    const st = useStore.getState();
    if (!st.profile) return setErr("Complete your profile first.");
    const error = validateSchedule([f], st.sessions.filter(s => s.id !== f.id), st.profile, subjects);
    if (error) return setErr(error);
    upsert({ ...f, title, status: rescheduleOnly && (f.status === "missed" || f.status === "skipped") ? "planned" : f.status });
    toast.success(rescheduleOnly ? `Moved to ${f.date} ${f.start}` : session ? "Session updated" : "Session added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{rescheduleOnly ? "Reschedule session" : session ? "Edit session" : "Add session"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          {!rescheduleOnly && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Subject</Label>
                  <Select value={f.subjectId} onValueChange={(v) => { const s = subjects.find((x) => x.id === v); setF({ ...f, subjectId: v, topicId: s?.chapters.flatMap((c) => c.topics)[0]?.id ?? "" }); }}>
                    <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label>Topic</Label>
                  <Select value={f.topicId} onValueChange={(v) => setF({ ...f, topicId: v })}>
                    <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
                    <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5"><Label>Title (optional)</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Defaults to topic name" /></div>
              <div className="grid gap-1.5"><Label>Task</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Study type</Label>
                  <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as StudyType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(STUDY_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label>Priority</Label>
                  <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v as Priority })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["high", "medium", "low"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5"><Label>Date</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Start</Label><Input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Minutes</Label><Input type="number" min={10} max={240} value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })} /></div>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
