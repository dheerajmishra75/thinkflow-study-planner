import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, today, uid } from "./planner/dates";
import { buildDemo, demoProfile } from "./planner/demo";
import { validateSchedule } from "./planner/validation";
import { generatePlan, nextRevisionInterval } from "./planner/engine";
import type { Adjustment, Chapter, Profile, SessionFeedback, StudySession, Subject, Topic } from "./planner/types";
import { scoreQuiz, topicPerformance, updateFromAssessment, validateContent, type TopicContent, type LearningProgress, type QuizAttempt, type QuizQuestion, type QuizMode } from './planner/learning';
import { buildNotices, defaultPreferences, mergeNotices, type Notice, type NoticePreferences } from './planner/notices';
export type { Notice } from './planner/notices';

interface State {
  profile: Profile | null;
  demo: boolean;
  subjects: Subject[];
  sessions: StudySession[];
  adjustments: Adjustment[];
  notices: Notice[];
  theme: "light" | "dark";
  hydrated: boolean;
  content: Record<string, TopicContent>;
  learningProgress: Record<string, LearningProgress>;
  attempts: QuizAttempt[];
  noticePreferences: NoticePreferences;
  cacheContent: (c: TopicContent) => void;
  updateLearning: (id: string, patch: Partial<LearningProgress>) => void;
  recordAssessment: (questions: QuizQuestion[], selected: Record<string, number | null>, mode: QuizMode, seconds: number, sessionId?: string) => QuizAttempt;
  refreshNotices: () => void;
  readNotice: (id: string) => void;
  setNoticePreferences: (prefs: NoticePreferences) => void;
  loadDemo: () => void;
  completeOnboarding: (p: Profile, subjects: Subject[]) => void;
  reset: () => void;
  setProfile: (p: Profile) => void;
  setTheme: (t: "light" | "dark") => void;
  // subjects
  upsertSubject: (s: Subject) => void;
  deleteSubject: (id: string) => void;
  addChapter: (subjectId: string, name: string) => void;
  updateChapter: (subjectId: string, chapterId: string, name: string) => void;
  deleteChapter: (subjectId: string, chapterId: string) => void;
  upsertTopic: (subjectId: string, chapterId: string, t: Topic) => void;
  deleteTopic: (subjectId: string, chapterId: string, topicId: string) => void;
  markForRevision: (topicId: string) => void;
  rateRevision: (topicId: string, rating: number) => void;
  importSubjects: (subjects: Subject[]) => void;
  // sessions
  upsertSession: (s: StudySession) => void;
  deleteSession: (id: string) => void;
  setStatus: (id: string, status: StudySession["status"]) => void;
  finishSession: (id: string, data: { actualMinutes: number; notes?: string; partial: boolean; feedback: SessionFeedback }) => void;
  regenerate: () => Adjustment;
  // adjustments
  propose: (a: Adjustment) => void;
  applyAdjustment: (id: string) => void;
  dismissAdjustment: (id: string) => void;
  notify: (text: string) => void;
  readNotices: () => void;
}

const mapTopic = (subjects: Subject[], topicId: string, fn: (t: Topic) => Topic) =>
  subjects.map((s) => ({ ...s, chapters: s.chapters.map((c) => ({ ...c, topics: c.topics.map((t) => (t.id === topicId ? fn(t) : t)) })) }));
const mapSubject = (subjects: Subject[], id: string, fn: (s: Subject) => Subject) => subjects.map((s) => (s.id === id ? fn(s) : s));
const mapChapter = (subjects: Subject[], sid: string, cid: string, fn: (c: Chapter) => Chapter) =>
  mapSubject(subjects, sid, (s) => ({ ...s, chapters: s.chapters.map((c) => (c.id === cid ? fn(c) : c)) }));

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: null, demo: false, subjects: [], sessions: [], adjustments: [], notices: [], theme: "light", hydrated: false,
      content: {}, learningProgress: {}, attempts: [], noticePreferences: defaultPreferences(),
      cacheContent: (c) => { validateContent(c, c.topicId); if (!findTopic(get().subjects, c.topicId)) throw new Error('Topic no longer exists.'); set(st => ({content:{...st.content,[c.topicId]:c}})); },
      updateLearning: (id, patch) => { if (!findTopic(get().subjects,id)) return; set(st => ({learningProgress:{...st.learningProgress,[id]:{bookmarked:false,materialComplete:false,savedNotes:'',lastOpened:new Date().toISOString(),...st.learningProgress[id],...patch}}})); },
      recordAssessment: (questions, selected, mode, seconds, sessionId) => {
        const st = get();
        if (questions.some(q => !findTopic(st.subjects, q.topicId))) throw new Error('Assessment topic no longer exists.');
        if (sessionId) { const session = st.sessions.find(s => s.id === sessionId); if (!session || !['done','partial'].includes(session.status) || questions.some(q => q.topicId !== session.topicId)) throw new Error('Assessment must match the completed session.'); }
        const attempt: QuizAttempt = {id:uid(),mode,at:new Date().toISOString(),seconds:Math.max(0,Math.round(seconds)),...scoreQuiz(questions,selected),...(sessionId ? {sessionId} : {})};
        const performance = topicPerformance(attempt);
        let subjects = st.subjects;
        for (const result of performance) subjects = mapTopic(subjects, result.topicId, t => updateFromAssessment(t,result.accuracy,st.attempts,today()));
        const notice: Notice = {id:`assessment:${attempt.id}`,at:attempt.at,text:`Learning check: ${attempt.correct}/${attempt.total} correct (${attempt.accuracy}%). ${performance.filter(p=>p.accuracy<80).length} topic(s) need practice or revision.`,read:false,category:'assessment',target:'progress'};
        set({subjects,attempts:[...st.attempts,attempt],notices:st.noticePreferences.categories.assessment?mergeNotices(st.notices,[notice]):st.notices});
        return attempt;
      },
      refreshNotices: () => { const st=get();if(!st.profile)return;const incoming=buildNotices(st.subjects,st.sessions,st.profile,st.noticePreferences,new Date());const merged=mergeNotices(st.notices,incoming);if(merged.length!==st.notices.length)set({notices:merged}); },
      readNotice: (id) => set(st=>({notices:st.notices.map(n=>n.id===id?{...n,read:true}:n)})),
      setNoticePreferences: (noticePreferences) => set({noticePreferences}),
      loadDemo: () => {
        const { subjects, sessions, content, attempts, learningProgress } = buildDemo();
        set({ profile: demoProfile, demo: true, subjects, sessions, content, attempts, learningProgress, noticePreferences:defaultPreferences(), adjustments: [], notices: [{ id: uid(), at: new Date().toISOString(), text: "Demo data loaded: 5 subjects, learning resources, assessments and study history.", read: false }] });
      },
      completeOnboarding: (profile, subjects) => {
        const sessions = generatePlan(subjects, profile, [], today(), 14);
        set({ profile, demo: false, subjects, sessions, content:{},attempts:[],learningProgress:{},noticePreferences:defaultPreferences(),adjustments: [{ id: uid(), createdAt: today(), kind: "generate", title: "Initial study plan created", reason: `Built ${sessions.length} sessions over 14 days within ${profile.hoursPerDay}h/day and ${profile.maxSessionsPerDay} sessions/day. Topics are ordered by exam urgency, importance, difficulty and your current confidence. The day before each exam is reserved for revision and a mock test.`, changes: [], status: "applied", add: [], remove: [] }], notices: [] });
      },
      reset: () => set({ profile: null, demo: false, subjects: [], sessions: [], adjustments: [], notices: [], content:{},learningProgress:{},attempts:[],noticePreferences:defaultPreferences() }),
      setProfile: (profile) => set({ profile }),
      setTheme: (theme) => set({ theme }),
      upsertSubject: (s) => set((st) => ({ subjects: st.subjects.some((x) => x.id === s.id) ? mapSubject(st.subjects, s.id, () => s) : [...st.subjects, s] })),
      deleteSubject: (id) => set((st) => ({ subjects: st.subjects.filter((s) => s.id !== id), sessions: st.sessions.filter((s) => s.subjectId !== id) })),
      addChapter: (sid, name) => set((st) => ({ subjects: mapSubject(st.subjects, sid, (s) => ({ ...s, chapters: [...s.chapters, { id: uid(), name, topics: [] }] })) })),
      updateChapter: (sid, cid, name) => set((st) => ({ subjects: mapChapter(st.subjects, sid, cid, (c) => ({ ...c, name })) })),
      deleteChapter: (sid, cid) => set((st) => { const ids = st.subjects.find(s => s.id === sid)?.chapters.find(c => c.id === cid)?.topics.map(t => t.id) ?? []; return { subjects: mapSubject(st.subjects, sid, (s) => ({ ...s, chapters: s.chapters.filter((c) => c.id !== cid) })), sessions: st.sessions.filter(s => !ids.includes(s.topicId)) }; }),
      upsertTopic: (sid, cid, t) => set((st) => ({ subjects: mapChapter(st.subjects, sid, cid, (c) => ({ ...c, topics: c.topics.some((x) => x.id === t.id) ? c.topics.map((x) => (x.id === t.id ? t : x)) : [...c.topics, t] })) })),
      deleteTopic: (sid, cid, tid) => set((st) => ({ subjects: mapChapter(st.subjects, sid, cid, (c) => ({ ...c, topics: c.topics.filter((x) => x.id !== tid) })), sessions: st.sessions.filter((s) => s.topicId !== tid) })),
      markForRevision: (tid) => set((st) => ({ subjects: mapTopic(st.subjects, tid, (t) => ({ ...t, needsRevision: true, nextRevision: today() })) })),
      rateRevision: (tid, rating) => set((st) => ({ subjects: mapTopic(st.subjects, tid, (t) => {
        const revisions = [...t.revisions, { date: today(), rating }];
        return { ...t, revisions, confidence: rating, lastStudied: today(), needsRevision: rating <= 2, nextRevision: addDays(today(), nextRevisionInterval(rating, t.difficulty, revisions.length)) };
      }) })),
      importSubjects: (subs) => set((st) => ({ subjects: [...st.subjects, ...subs] })),
      upsertSession: (s) => set((st) => ({ sessions: st.sessions.some((x) => x.id === s.id) ? st.sessions.map((x) => (x.id === s.id ? s : x)) : [...st.sessions, s] })),
      deleteSession: (id) => set((st) => ({ sessions: st.sessions.filter((s) => s.id !== id) })),
      setStatus: (id, status) => set((st): Partial<State> => ({ sessions: st.sessions.map((s): StudySession => (s.id === id ? { ...s, status, actualMinutes: status === "done" ? s.actualMinutes ?? s.duration : s.actualMinutes } : s)) })),
      finishSession: (id, { actualMinutes, notes, partial, feedback }) => {
        const s = get().sessions.find((x) => x.id === id);
        if (!s || s.status === "done" || s.status === "partial") return;
        set((st): Partial<State> => ({
          sessions: st.sessions.map((x): StudySession => (x.id === id ? { ...x, status: partial ? "partial" : "done", actualMinutes, notes, feedback } : x)),
          subjects: mapTopic(st.subjects, s.topicId, (t) => {
            const spent = t.spentMinutes + actualMinutes;
            const revisions = s.type === "revise" ? [...t.revisions, { date: today(), rating: feedback.confidence }] : t.revisions;
            const reps = Math.max(1, revisions.length);
            return {
              ...t,
              spentMinutes: spent,
              status: feedback.completedTopic ? "done" : "learning",
              // Blend logged difficulty into the topic so future plans adapt.
              difficulty: Math.round((t.difficulty * 2 + feedback.difficulty) / 3),
              confidence: feedback.confidence,
              lastStudied: today(),
              needsRevision: feedback.needsRevision,
              revisions,
              nextRevision: addDays(today(), feedback.needsRevision ? 1 : nextRevisionInterval(feedback.confidence, feedback.difficulty, reps)),
            };
          }),
        }));
        get().notify(`Logged ${actualMinutes} min on ${s.title}.${feedback.needsRevision ? " Revision scheduled for tomorrow." : ""}`);
      },
      regenerate: () => {
        const st = get();
        const now = today();
        const kept = st.sessions.filter((s) => s.date < now || s.status !== "planned");
        const futurePlanned = st.sessions.filter((s) => s.date >= now && s.status === "planned");
        if (!st.profile) throw new Error("Complete your profile first.");
        const add = generatePlan(st.subjects, st.profile, kept.filter((s) => s.date >= now), now, 14, st.sessions);
        const adj: Adjustment = { id: uid(), createdAt: now, kind: "generate", title: "Regenerate the next 14 days", reason: `Rebuilds upcoming planned sessions from your current syllabus progress, confidence ratings and personal pace. Completed and past sessions are kept. ${futurePlanned.length} planned sessions will be replaced by ${add.length}.`, changes: [`− ${futurePlanned.length} upcoming planned sessions`, `+ ${add.length} new sessions`], status: "proposed", add, remove: futurePlanned.map((s) => s.id) };
        return adj;
      },
      propose: (a) => set((st) => ({ adjustments: [a, ...st.adjustments.filter((x) => !(x.status === "proposed" && x.kind === a.kind))] })),
      applyAdjustment: (id) => {
        const a = get().adjustments.find((x) => x.id === id);
        if (!a || a.status !== "proposed") return;
        const st = get();
        if (!st.profile) return;
        const error = validateSchedule(a.add, st.sessions.filter(s => !a.remove.includes(s.id)), st.profile, st.subjects);
        if (error) throw new Error(error);
        set((st) => ({
          sessions: [...st.sessions.filter((s) => !a.remove.includes(s.id)), ...a.add],
          adjustments: st.adjustments.map((x) => (x.id === id ? { ...x, status: "applied" } : x)),
        }));
        get().notify(`Applied: ${a.title}`);
      },
      dismissAdjustment: (id) => set((st) => ({ adjustments: st.adjustments.map((x) => (x.id === id ? { ...x, status: "dismissed" } : x)) })),
      notify: (text) => set((st) => ({ notices: [{ id: uid(), at: new Date().toISOString(), text, read: false }, ...st.notices].slice(0, 30) })),
      readNotices: () => set((st) => ({ notices: st.notices.map((n) => ({ ...n, read: true })) })),
    }),
    {
      name: "thinkflow-v1",
      partialize: (st) => st.demo ? { ...workspaceSnapshot(st), demo: true } : { demo: false, theme: st.theme },
      skipHydration: true,
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

export function workspaceSnapshot(st: Pick<State, 'profile'|'subjects'|'sessions'|'adjustments'|'notices'|'theme'|'content'|'attempts'|'learningProgress'|'noticePreferences'>) {
  return {profile:st.profile,subjects:st.subjects,sessions:st.sessions,adjustments:st.adjustments,notices:st.notices,theme:st.theme,content:st.content,attempts:st.attempts,learningProgress:st.learningProgress,noticePreferences:st.noticePreferences};
}

export const subjectById = (subjects: Subject[], id: string) => subjects.find((s) => s.id === id);
export function findTopic(subjects: Subject[], topicId: string) {
  for (const s of subjects) for (const c of s.chapters) for (const t of c.topics) if (t.id === topicId) return { subject: s, chapter: c, topic: t };
  return null;
}
