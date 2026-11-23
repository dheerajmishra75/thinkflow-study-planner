import { useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, Check, Copy, RefreshCw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { findTopic, useStore } from '@/lib/store';
import { chooseQuestions, learningLevel, syllabusKey, topicPerformance, validateContent, type QuizAttempt, type QuizMode, type QuizQuestion, type TopicContent } from '@/lib/planner/learning';
import { generateTopicContent } from '@/lib/ai.functions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type LearningTab = 'material' | 'notes' | 'questions' | 'quiz';

export function useTopicContentGenerator(topicId: string) {
  const gen = useServerFn(generateTopicContent);
  const cache = useStore(s => s.cacheContent);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const ref = findTopic(useStore.getState().subjects, topicId); if (!ref) return;
    setBusy(true);
    try {
      const r = await gen({ data: { subject: ref.subject.name, chapter: ref.chapter.name, topic: ref.topic.name } });
      if (!r.ok) throw new Error(r.status === 429 ? 'AI is busy, try again in a minute.' : r.status === 402 ? 'AI credits are exhausted.' : r.error);
      const raw = JSON.parse(r.result) as { questions?: Record<string, unknown>[] } & Record<string, unknown>;
      const withIds = { ...raw, questions: (raw.questions ?? []).map((q, i) => ({ ...q, id: `${topicId}-ai-${Date.now()}-${i}`, topicId })) };
      const body = validateContent(withIds, topicId);
      const c: TopicContent = { ...body, topicId, source: 'ai', generatedAt: new Date().toISOString(), syllabusKey: syllabusKey(ref.subject.name, ref.chapter.name, ref.topic.name) };
      cache(c); toast.success('Study material ready');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed.';
      toast.error(/unauthor|401|sign/i.test(msg) ? 'Sign in to a student account to generate material.' : `Could not create valid material: ${msg.slice(0, 160)}`);
    } finally { setBusy(false); }
  };
  return { run, busy };
}

export function Quiz({ questions, mode, sessionId, onDone }: { questions: QuizQuestion[]; mode: QuizMode; sessionId?: string; onDone?: (a: QuizAttempt) => void }) {
  const record = useStore(s => s.recordAssessment);
  const subjects = useStore(s => s.subjects);
  const [sel, setSel] = useState<Record<string, number | null>>({});
  const [started] = useState(Date.now());
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [key, setKey] = useState(0);
  if (!questions.length) return <p className="text-sm text-muted-foreground">No questions available for this topic yet.</p>;
  const answered = questions.filter(q => typeof sel[q.id] === 'number').length;
  const submit = () => {
    try { const a = record(questions, sel, mode, Math.round((Date.now() - started) / 1000), sessionId); setResult(a); onDone?.(a); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save the result.'); }
  };
  if (result) {
    const perf = topicPerformance(result);
    const weak = perf.filter(p => p.accuracy < 60);
    return <div key={key} className="space-y-5">
      <div className="panel grid grid-cols-2 divide-x text-center sm:grid-cols-4">
        {[['Score', `${result.correct}/${result.total}`], ['Accuracy', `${result.accuracy}%`], ['Incorrect', String(result.answers.filter(a => a.selected !== null && !a.correct).length)], ['Time', `${Math.floor(result.seconds / 60)}m ${result.seconds % 60}s`]].map(([l, v]) =>
          <div key={l} className="p-3"><div className="tabular text-lg font-semibold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>)}
      </div>
      <p className="text-sm">{result.accuracy >= 80 ? 'Good understanding. Revision moves a few days out — one test is not full mastery, so keep reviewing.' : result.accuracy >= 60 ? 'Moderate understanding. Some extra practice has been prioritised for this topic.' : 'This topic needs work. Review the short notes, and revision is scheduled soon.'}</p>
      {perf.length > 1 && <div className="space-y-1 text-sm">{perf.map(p => <div key={p.topicId} className="flex justify-between"><span>{findTopic(subjects, p.topicId)?.topic.name}</span><span className={cn('tabular', p.accuracy < 60 && 'text-warm')}>{p.accuracy}%</span></div>)}</div>}
      {weak.length > 0 && <p className="text-xs text-warm">Needs improvement: {weak.map(w => findTopic(subjects, w.topicId)?.topic.name).join(', ')}</p>}
      <ol className="space-y-4">{result.answers.map((a, i) => <li key={a.question.id} className="border-b pb-3 text-sm">
        <p className="font-medium">{i + 1}. {a.question.question}</p>
        <p className={cn('mt-1', a.correct ? 'text-primary' : 'text-warm')}>{a.selected === null ? 'Not answered' : a.correct ? 'Correct' : `Your answer: ${a.question.options[a.selected]}`}</p>
        {!a.correct && <p className="mt-1">Correct answer: {a.question.options[a.question.correctIndex]}</p>}
        <p className="mt-1 text-muted-foreground">{a.question.explanation}</p></li>)}</ol>
      <Button variant="outline" onClick={() => { setSel({}); setResult(null); setKey(key + 1); }}><RefreshCw />Retry test</Button>
    </div>;
  }
  return <div className="space-y-6">
    {questions.map((q, i) => <fieldset key={q.id}><legend className="text-sm font-medium">{i + 1}. {q.question} <span className="ml-1 text-xs font-normal text-muted-foreground">{q.difficulty}</span></legend>
      <div className="mt-2 grid gap-1.5">{q.options.map((o, oi) => <button key={oi} type="button" onClick={() => setSel({ ...sel, [q.id]: oi })} className={cn('rounded-md border px-3 py-2 text-left text-sm', sel[q.id] === oi ? 'border-primary bg-leaf-soft' : 'hover:bg-accent')}>{o}</button>)}</div></fieldset>)}
    <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{answered}/{questions.length} answered{answered < questions.length && ' · unanswered count as incorrect'}</span><Button onClick={submit} disabled={!answered}>Submit test</Button></div>
  </div>;
}

export function TopicLearning({ topicId, initialTab = 'material', onClose }: { topicId: string; initialTab?: LearningTab; onClose?: () => void }) {
  const { subjects, content, learningProgress, attempts, updateLearning } = useStore();
  const ref = findTopic(subjects, topicId);
  const c = content[topicId];
  const p = learningProgress[topicId];
  const { run, busy } = useTopicContentGenerator(topicId);
  const [tab, setTab] = useState<LearningTab>(initialTab);
  const chapterQuestions = useMemo(() => ref ? chooseQuestions(ref.chapter.topics.map(t => content[t.id]).filter((x): x is TopicContent => !!x), 'chapter') : [], [ref, content]);
  if (!ref) return null;
  const level = learningLevel(ref.topic, attempts);
  const copy = async () => { if (!c) return; await navigator.clipboard.writeText(`${ref.topic.name}\n\n${c.notes.map(n => '• ' + n).join('\n')}`); toast.success('Notes copied'); };
  return <div className="min-w-0">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="eyebrow">{ref.subject.name} · {ref.chapter.name}</p><h2 className="mt-1 break-words text-xl font-semibold">{ref.topic.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{level} · Confidence {ref.topic.confidence}/5{ref.topic.nextRevision && ` · Revision ${ref.topic.nextRevision}`}{c && ` · ${c.source === 'ai' ? 'AI-generated, review critically' : 'Demo material'}`}</p></div>
      <div className="flex shrink-0">{c && <Button variant="ghost" size="icon" aria-label={p?.bookmarked ? 'Remove bookmark' : 'Bookmark topic'} onClick={() => updateLearning(topicId, { bookmarked: !p?.bookmarked })}>{p?.bookmarked ? <BookmarkCheck className="text-primary" /> : <Bookmark />}</Button>}{onClose && <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X /></Button>}</div>
    </div>
    {!c ? <div className="mt-8 rounded-md border border-dashed p-6 text-center"><p className="text-sm text-muted-foreground">No study material for this topic yet.</p><Button className="mt-4" disabled={busy} onClick={run}><Sparkles />{busy ? 'Generating and checking…' : 'Generate material, notes & MCQs'}</Button></div> :
    <Tabs value={tab} onValueChange={v => { setTab(v as LearningTab); updateLearning(topicId, { lastOpened: new Date().toISOString() }); }} className="mt-5">
      <TabsList className="flex-wrap"><TabsTrigger value="material">Study material</TabsTrigger><TabsTrigger value="notes">Short notes</TabsTrigger><TabsTrigger value="questions">Important questions</TabsTrigger><TabsTrigger value="quiz">MCQ practice</TabsTrigger></TabsList>
      <TabsContent value="material" className="mt-5 space-y-5 text-sm leading-relaxed">
        <p>{c.introduction}</p>
        <div><h3 className="font-semibold">Learning objectives</h3><ul className="mt-1 list-disc pl-5">{c.objectives.map(o => <li key={o}>{o}</li>)}</ul></div>
        {c.sections.map(s => <div key={s.title}><h3 className="font-semibold">{s.title}</h3><p className="mt-1 whitespace-pre-line">{s.body}</p></div>)}
        <div><h3 className="font-semibold">Key definitions</h3><dl className="mt-1 space-y-1">{c.definitions.map(d => <div key={d.term}><dt className="inline font-medium">{d.term}: </dt><dd className="inline text-muted-foreground">{d.meaning}</dd></div>)}</dl></div>
        <div><h3 className="font-semibold">Examples</h3><ul className="mt-1 list-disc pl-5">{c.examples.map(o => <li key={o}>{o}</li>)}</ul></div>
        {c.formulas.length > 0 && <div><h3 className="font-semibold">Formulas</h3><ul className="mt-1 space-y-1 font-mono text-xs">{c.formulas.map(o => <li key={o}>{o}</li>)}</ul></div>}
        <div><h3 className="font-semibold">Real-world applications</h3><ul className="mt-1 list-disc pl-5">{c.applications.map(o => <li key={o}>{o}</li>)}</ul></div>
        <div className="flex flex-wrap gap-2 border-t pt-4"><Button variant={p?.materialComplete ? 'secondary' : 'default'} onClick={() => updateLearning(topicId, { materialComplete: !p?.materialComplete })}><Check />{p?.materialComplete ? 'Material completed' : 'Mark material as read'}</Button><Button variant="outline" onClick={() => setTab('quiz')}>Test yourself</Button>{c.source === 'ai' && <Button variant="ghost" disabled={busy} onClick={run}><RefreshCw />Regenerate</Button>}</div>
      </TabsContent>
      <TabsContent value="notes" className="mt-5 space-y-4 text-sm">
        <ul className="space-y-2">{c.notes.map(n => <li key={n} className="border-l-2 border-primary pl-3">{n}</li>)}</ul>
        <div><label htmlFor={`notes-${topicId}`} className="text-xs font-medium">My notes</label><Textarea id={`notes-${topicId}`} className="mt-1" rows={3} defaultValue={p?.savedNotes ?? ''} onBlur={e => updateLearning(topicId, { savedNotes: e.target.value })} placeholder="Saved when you click away" /></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={copy}><Copy />Copy notes</Button><Button variant="outline" onClick={() => { useStore.getState().rateRevision(topicId, Math.max(3, ref.topic.confidence)); toast.success('Marked as revised'); }}><Check />Mark as revised</Button><Button variant="ghost" onClick={() => setTab('material')}>Open detailed explanation</Button></div>
      </TabsContent>
      <TabsContent value="questions" className="mt-5 space-y-3 text-sm">{c.importantQuestions.map(q => <details key={q.question} className="border-b pb-2"><summary className="cursor-pointer font-medium">{q.question}</summary><p className="mt-2 text-muted-foreground">{q.answer}</p></details>)}</TabsContent>
      <TabsContent value="quiz" className="mt-5 space-y-6">
        <Quiz questions={chooseQuestions([c], 'topic')} mode="topic" />
        {chapterQuestions.length > 5 && <details className="border-t pt-4"><summary className="cursor-pointer text-sm font-medium">Chapter test · {ref.chapter.name} ({chapterQuestions.length} questions)</summary><div className="mt-4"><Quiz questions={chapterQuestions} mode="chapter" /></div></details>}
      </TabsContent>
    </Tabs>}
  </div>;
}
