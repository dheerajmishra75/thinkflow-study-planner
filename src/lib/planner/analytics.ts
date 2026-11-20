import { addDays } from './dates';
import { allTopics, subjectCompletion } from './engine';
import type { Subject, StudySession } from './types';
export function analytics(subjects: Subject[], sessions: StudySession[], now: string) {
  const topics = allTopics(subjects);
  const week = Array.from({length:7}, (_,i) => {
    const date = addDays(now, i-6), day = sessions.filter(s => s.date === date && s.status !== 'skipped');
    return { date, planned: day.reduce((a,s)=>a+s.duration,0), actual:day.filter(s=>s.status==='done'||s.status==='partial').reduce((a,s)=>a+(s.actualMinutes??s.duration),0) };
  });
  const recent = sessions.filter(s=>s.date>=addDays(now,-6)&&s.date<=now&&s.status!=='skipped');
  return { completion: topics.length ? Math.round(topics.filter(t=>t.topic.status==='done').length/topics.length*100):0,
    totalTopics: topics.length, doneTopics: topics.filter(t=>t.topic.status==='done').length,
    consistency: week.filter(d=>d.actual>0).length,
    adherence: recent.length ? Math.round(recent.filter(s=>s.status==='done').length/recent.length*100):0,
    missed: sessions.filter(s=>s.status==='missed'||(s.status==='planned'&&s.date<now)).length,
    revisions: sessions.filter(s=>s.type==='revise'&&s.status==='done').length,
    week, subjects:subjects.map(s=>{const ts=allTopics([s]); const studied=ts.filter(t=>t.topic.status!=='not_started');const confidence=studied.length?studied.reduce((a,t)=>a+t.topic.confidence,0)/studied.length:0;return {subject:s, completion:subjectCompletion(s),confidence,readiness:Math.round(subjectCompletion(s)*0.6+confidence/5*40),incomplete:ts.filter(t=>t.topic.status!=='done').length};}) };
}
