import { useState } from 'react';
import { useStore } from '@/lib/store';
import { today } from '@/lib/planner/dates';
import { topicPerformance } from '@/lib/planner/learning';
import { Section } from '@/components/app/bits';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TopicLearning } from './TopicLearning';

export function LearningWidgets() {
  const { subjects, attempts } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const now = today();
  const topics = subjects.flatMap(s => s.chapters.flatMap(c => c.topics.map(t => ({ t, s }))));
  const queue = topics.filter(({ t }) => t.needsRevision || (t.nextRevision && t.nextRevision <= now)).sort((a, b) => (a.t.nextRevision ?? '').localeCompare(b.t.nextRevision ?? '')).slice(0, 6);
  const recent = attempts.slice(-10);
  const scores = new Map<string, number[]>();
  for (const a of recent) for (const p of topicPerformance(a)) scores.set(p.topicId, [...(scores.get(p.topicId) ?? []), p.accuracy]);
  const avg = (v: number[]) => Math.round(v.reduce((x, y) => x + y, 0) / v.length);
  const ranked = [...scores].map(([id, v]) => ({ id, acc: avg(v), name: topics.find(x => x.t.id === id)?.t.name })).filter(r => r.name);
  const weak = ranked.filter(r => r.acc < 60).slice(0, 4), strong = ranked.filter(r => r.acc >= 80).slice(0, 4);
  const overall = recent.length ? avg(recent.map(a => a.accuracy)) : null;
  return <>
    <Section title="Learning performance">
      <div className="panel p-4">
        {overall === null ? <p className="text-sm text-muted-foreground">No tests yet. Open a topic in Subjects & Syllabus and take an MCQ test.</p> : <>
          <div className="flex items-baseline justify-between"><span className="tabular text-2xl font-semibold">{overall}%</span><span className="text-xs text-muted-foreground">avg accuracy · last {recent.length} tests</span></div>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs font-medium text-warm">Needs improvement</p>{weak.length ? weak.map(w => <button key={w.id} className="block text-left hover:underline" onClick={() => setOpen(w.id)}>{w.name} · {w.acc}%</button>) : <p className="text-muted-foreground">None right now</p>}</div>
            <div><p className="text-xs font-medium text-primary">Strong topics</p>{strong.length ? strong.map(w => <button key={w.id} className="block text-left hover:underline" onClick={() => setOpen(w.id)}>{w.name} · {w.acc}%</button>) : <p className="text-muted-foreground">Keep testing</p>}</div>
          </div></>}
      </div>
    </Section>
    <Section title="Revision queue">
      <div className="panel divide-y">
        {!queue.length && <p className="p-4 text-sm text-muted-foreground">Nothing due for revision today.</p>}
        {queue.map(({ t, s }) => <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1"><p className="truncate text-sm">{t.name}</p><p className="text-xs text-muted-foreground">{s.name} · {t.nextRevision && t.nextRevision < now ? 'overdue' : 'due'} {t.nextRevision ?? 'now'} · confidence {t.confidence}/5</p></div>
          <Button size="sm" variant="outline" onClick={() => setOpen(t.id)}>Revise</Button>
        </div>)}
      </div>
    </Section>
    {open && <Dialog open onOpenChange={o => !o && setOpen(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader className="sr-only"><DialogTitle>Topic learning</DialogTitle></DialogHeader><TopicLearning topicId={open} initialTab="notes" /></DialogContent></Dialog>}
  </>;
}
