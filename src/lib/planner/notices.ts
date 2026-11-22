import { daysBetween, toISO, toMin } from './dates';
import type { Profile, StudySession, Subject } from './types';

export const NOTICE_LABELS = { exam: 'Examinations', session: 'Study reminders', missed: 'Missed sessions', revision: 'Revision', progress: 'Syllabus progress', assessment: 'Assessment results', adaptive: 'Plan adjustments' } as const;
export type NoticeCategory = keyof typeof NOTICE_LABELS;
export type NoticeTarget = 'plan' | 'subjects' | 'learning' | 'progress';
export interface Notice { id: string; at: string; text: string; read: boolean; category?: NoticeCategory; topicId?: string; target?: NoticeTarget }
export interface NoticePreferences { categories: Record<NoticeCategory, boolean>; browser: boolean }
export const defaultPreferences = (): NoticePreferences => ({ categories: { exam: true, session: true, missed: true, revision: true, progress: true, assessment: true, adaptive: true }, browser: false });
export function buildNotices(subjects: Subject[], sessions: StudySession[], profile: Profile, prefs: NoticePreferences, now: Date): Notice[] {
  const date = toISO(now), minute = now.getHours() * 60 + now.getMinutes(), at = now.toISOString();
  const result: Notice[] = [];
  const push = (notice: Notice) => { if (notice.category && prefs.categories[notice.category]) result.push(notice); };
  for (const s of subjects) {
    const topics = s.chapters.flatMap(c => c.topics), pending = topics.filter(t => t.status !== 'done');
    const days = daysBetween(date, s.examDate), total = topics.length;
    if (days >= 0 && days <= 7) {
      const workload = Math.ceil(pending.reduce((n, t) => n + Math.max(0, t.estMinutes - t.spentMinutes), 0) / 60);
      const available = Math.max(0, days - 1) * profile.hoursPerDay;
      const priorities = [...pending].sort((a, b) => b.difficulty - a.difficulty || a.confidence - b.confidence).slice(0, 2).map(t => t.name).join(' and ');
      push({ id: `exam:${s.id}:${s.examDate}:${date}`, at, read: false, category: 'exam', target: 'plan', text: `${s.name} exam ${days === 0 ? 'is today' : `is in ${days} days`}. ${pending.length}/${total} topics remain (~${workload}h). ${available}h of your total study capacity remains before the revision buffer.${priorities ? ` Prioritise ${priorities}.` : ' Focus on revision and practice.'}${workload > available ? ' The remaining workload exceeds your available time.' : ''}` });
    }
    const complete = total ? Math.floor((total - pending.length) / total * 100) : 0;
    for (const milestone of [25, 50, 75, 100]) if (complete >= milestone) push({ id: `progress:${s.id}:${milestone}`, at, read: false, category: 'progress', target: 'progress', text: `${s.name}: ${milestone}% of your syllabus completed. ${pending.length} topics remain.` });
    for (const t of topics) if (t.nextRevision && t.nextRevision <= date) push({ id: `revision:${t.id}:${t.nextRevision}`, at, read: false, category: 'revision', topicId: t.id, target: 'learning', text: `Revision due: ${t.name} (${s.name}). Confidence ${t.confidence}/5. Review your notes and take a quick test.` });
  }
  for (const s of sessions) {
    const missed = s.status === 'missed' || (s.status === 'planned' && (s.date < date || s.date === date && toMin(s.start) + s.duration < minute));
    if (missed) push({ id: `missed:${s.id}:${s.date}:${s.start}`, at, read: false, category: 'missed', target: 'plan', text: `Missed: ${s.title}. Review a rescheduling suggestion in your study plan.` });
    const until = toMin(s.start) - minute;
    if (s.status === 'planned' && s.date === date && until >= 0 && until <= 30) push({ id: `session:${s.id}:${s.date}:${s.start}`, at, read: false, category: 'session', target: 'plan', text: `${s.title} starts at ${s.start} (${s.duration} min). ${s.description}` });
  }
  return result;
}
export const mergeNotices = (existing: Notice[], incoming: Notice[]) => {
  const ids = new Set(existing.map(n => n.id));
  return [...incoming.filter(n => !ids.has(n.id)), ...existing];
};