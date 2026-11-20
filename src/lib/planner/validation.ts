import { toMin } from './dates';
import type { Profile, StudySession, Subject } from './types';
export function validateSchedule(add: StudySession[], existing: StudySession[], profile: Profile, subjects: Subject[]): string | null {
  const active = [...existing.filter(s => s.status !== 'skipped' && s.status !== 'missed'), ...add];
  for (const s of add) {
    const subject = subjects.find(x => x.id === s.subjectId);
    if (!subject?.chapters.some(c => c.topics.some(t => t.id === s.topicId))) return 'Choose a topic in this subject.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date) || Number.isNaN(Date.parse(s.date))) return 'Choose a valid date.';
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s.start)) return 'Choose a valid time.';
    if (!Number.isFinite(s.duration) || s.duration < 10 || s.duration > 240) return 'Study blocks must be 10–240 minutes.';
    if (s.date >= subject.examDate) return 'Schedule preparation before the subject’s exam.';
    if (toMin(s.start) + s.duration > 1440) return 'A session cannot run past midnight.';
    const day = active.filter(x => x.date === s.date);
    if (day.reduce((a,x) => a + x.duration, 0) > profile.hoursPerDay * 60) return `This day exceeds your ${profile.hoursPerDay} study hours.`;
    if (day.length > profile.maxSessionsPerDay) return `This day exceeds your ${profile.maxSessionsPerDay} session limit.`;
    if (day.some(x => x.id !== s.id && toMin(x.start) < toMin(s.start) + s.duration && toMin(s.start) < toMin(x.start) + x.duration)) return 'These sessions overlap. Choose a free time.';
  }
  return null;
}
