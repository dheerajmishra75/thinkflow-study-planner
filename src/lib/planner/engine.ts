/**
 * ThinkFlow planning engine — explainable, rule-based scoring.
 * No trained model: weights are hand-tuned heuristics and adapt using the
 * student's own logged feedback (difficulty, confidence, actual time).
 */
import { addDays, daysBetween, fromMin, toMin, uid } from "./dates";
import type { Adjustment, Priority, PrefTime, Profile, StudySession, StudyType, Subject, Topic } from "./types";

export const START_BY_PREF: Record<PrefTime, number> = {
  morning: 7 * 60,
  afternoon: 13 * 60,
  evening: 17 * 60,
  night: 20 * 60,
};
export const MAX_BLOCK = 90;
export const BREAK = 15;

export interface TopicRef { subject: Subject; topic: Topic; chapterName: string }

export const allTopics = (subjects: Subject[]): TopicRef[] =>
  subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => ({ subject: s, topic: t, chapterName: c.name }))));

export function subjectCompletion(s: Subject) {
  const ts = s.chapters.flatMap((c) => c.topics);
  if (!ts.length) return 0;
  return Math.round((ts.filter((t) => t.status === "done").length / ts.length) * 100);
}

/** Weak-subject signal: low average confidence on studied topics, or high logged difficulty. */
export function weaknessScore(s: Subject, sessions: StudySession[]) {
  const ts = s.chapters.flatMap((c) => c.topics).filter((t) => t.status !== "not_started");
  const conf = ts.length ? ts.reduce((a, t) => a + t.confidence, 0) / ts.length : 3;
  const fb = sessions.filter((x) => x.subjectId === s.id && x.feedback);
  const diff = fb.length ? fb.reduce((a, x) => a + (x.feedback?.difficulty ?? 3), 0) / fb.length : s.difficulty;
  const missed = sessions.filter((x) => x.subjectId === s.id && x.status === "missed").length;
  return Math.round(((5 - conf) * 12 + diff * 8 + missed * 4) * 10) / 10;
}

/** Topic priority: higher = study sooner. Every factor is visible for explanation. */
export function topicScore(ref: TopicRef, from: string) {
  const { subject, topic } = ref;
  const daysLeft = Math.max(1, daysBetween(from, subject.examDate));
  const urgency = 40 / daysLeft;
  const importance = subject.importance * 4;
  const difficulty = topic.difficulty * 3;
  const gap = (5 - topic.confidence) * 2;
  return urgency + importance + difficulty + gap;
}

export function priorityFor(score: number): Priority {
  return score >= 32 ? "high" : score >= 24 ? "medium" : "low";
}

/** Spaced repetition: interval grows with confidence, shrinks with difficulty. */
export function nextRevisionInterval(confidence: number, difficulty: number, reps: number) {
  const base = [1, 3, 7, 14, 30][Math.min(reps, 4)] ?? 30;
  const factor = 0.5 + confidence / 5 - (difficulty - 3) * 0.1;
  return Math.max(1, Math.round(base * Math.max(0.4, factor)));
}

/** Duration estimate adjusted by the student's own speed (actual vs estimate). */
export function personalSpeed(sessions: StudySession[]) {
  const done = sessions.filter((s) => s.status === "done" && s.actualMinutes && s.type === "learn");
  if (done.length < 3) return 1;
  const r = done.reduce((a, s) => a + (s.actualMinutes ?? s.duration) / s.duration, 0) / done.length;
  return Math.min(1.5, Math.max(0.6, r));
}

interface DayLoad { used: number; count: number; cursor: number }

function makeCalendar(existing: StudySession[], profile: Profile) {
  const days = new Map<string, DayLoad>();
  const start = START_BY_PREF[profile.prefTime];
  const get = (d: string) => {
    if (!days.has(d)) {
      const own = existing.filter((s) => s.date === d && s.status !== "skipped" && s.status !== "missed");
      const used = own.reduce((a, s) => a + s.duration, 0);
      const cursor = own.reduce((a, s) => Math.max(a, toMin(s.start) + s.duration + BREAK), start);
      days.set(d, { used, count: own.length, cursor });
    }
    return days.get(d)!;
  };
  const capacity = profile.hoursPerDay * 60;
  const fits = (d: string, mins: number) => {
    const l = get(d);
    return l.used + mins <= capacity && l.count < profile.maxSessionsPerDay && l.cursor + mins <= 23 * 60;
  };
  const place = (d: string, mins: number) => {
    const l = get(d);
    const at = l.cursor;
    l.used += mins;
    l.count += 1;
    l.cursor = at + mins + BREAK;
    return fromMin(at);
  };
  return { fits, place, capacity };
}

function session(ref: TopicRef, date: string, start: string, duration: number, type: StudyType, priority: Priority, description: string): StudySession {
  return {
    id: uid(),
    subjectId: ref.subject.id,
    topicId: ref.topic.id,
    title: ref.topic.name,
    description,
    date,
    start,
    duration,
    priority,
    type,
    status: "planned",
  };
}

const DESC: Record<StudyType, (t: string) => string> = {
  learn: (t) => `Understand the core ideas of ${t}; write a one-page summary.`,
  revise: (t) => `Active recall on ${t}: close notes, rebuild key points, check gaps.`,
  problems: (t) => `Work through 5–8 problems on ${t}, increasing difficulty.`,
  practice: (t) => `Timed previous-year questions on ${t}.`,
  mock: (t) => `Full timed mock for ${t}. Review every mistake afterwards.`,
};

/**
 * Generate a plan from `from` for `horizon` days on top of `existing` sessions.
 * Never exceeds the daily capacity or session count. Reserves the day before
 * each exam as buffer (revision + mock only).
 */
export function generatePlan(subjects: Subject[], profile: Profile, existing: StudySession[], from: string, horizon = 14, allSessions: StudySession[] = existing): StudySession[] {
  const cal = makeCalendar(existing, profile);
  const speed = personalSpeed(allSessions);
  const out: StudySession[] = [];
  const scheduled = new Set(existing.filter((s) => s.type === "learn" && s.status !== "missed" && s.status !== "skipped").map((s) => s.topicId));
  const end = addDays(from, horizon);

  // 1. Buffer days: revision + mock the day before each exam.
  for (const s of subjects) {
    const buf = addDays(s.examDate, -1);
    if (buf < from || buf > end) continue;
    const weakest = allTopics([s]).sort((a, b) => a.topic.confidence - b.topic.confidence)[0];
    if (!weakest) continue;
    if (cal.fits(buf, 90)) out.push(session(weakest, buf, cal.place(buf, 90), 90, "mock", "high", `Final mock for ${s.name}. Review every mistake.`));
    if (cal.fits(buf, 45)) out.push(session(weakest, buf, cal.place(buf, 45), 45, "revise", "high", `Final revision of your weakest ${s.name} topics.`));
  }

  // 2. New learning ordered by score.
  const pending = allTopics(subjects)
    .filter((r) => r.topic.status !== "done" && !scheduled.has(r.topic.id) && r.subject.examDate > from)
    .sort((a, b) => topicScore(b, from) - topicScore(a, from));

  for (const ref of pending) {
    const remaining = Math.max(30, Math.round((ref.topic.estMinutes - ref.topic.spentMinutes) * speed));
    const lastDay = addDays(ref.subject.examDate, -2);
    let left = remaining;
    let day = from;
    const prio = priorityFor(topicScore(ref, from));
    let learnedOn: string | null = null;
    while (left > 0 && day <= lastDay && day <= end) {
      const block = Math.min(MAX_BLOCK, left);
      if (cal.fits(day, block)) {
        out.push(session(ref, day, cal.place(day, block), block, "learn", prio, DESC.learn(ref.topic.name)));
        left -= block;
        learnedOn = day;
      } else day = addDays(day, 1);
    }
    if (!learnedOn) continue;
    // 3. Practice after hard topics, revision on spaced intervals.
    if (ref.topic.difficulty >= 3) {
      const d = placeAfter(cal, learnedOn, lastDay, 45);
      if (d) out.push(session(ref, d, cal.place(d, 45), 45, "problems", prio, DESC.problems(ref.topic.name)));
    }
    for (const gap of [1, 4]) {
      const target = addDays(learnedOn, gap);
      const d = placeAfter(cal, target, lastDay, 30);
      if (d) out.push(session(ref, d, cal.place(d, 30), 30, "revise", prio === "low" ? "low" : "medium", DESC.revise(ref.topic.name)));
    }
  }

  // 4. Revisions that are due by spaced repetition.
  for (const ref of allTopics(subjects)) {
    if (!ref.topic.nextRevision || ref.topic.nextRevision > end) continue;
    const d = placeAfter(cal, ref.topic.nextRevision < from ? from : ref.topic.nextRevision, addDays(ref.subject.examDate, -1), 30);
    if (d) out.push(session(ref, d, cal.place(d, 30), 30, "revise", ref.topic.confidence <= 2 ? "high" : "medium", DESC.revise(ref.topic.name)));
  }
  return out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

function placeAfter(cal: ReturnType<typeof makeCalendar>, from: string, until: string, mins: number) {
  for (let d = from; d <= until; d = addDays(d, 1)) if (cal.fits(d, mins)) return d;
  return null;
}

/* ---------- Adaptive scenarios (each returns a proposal, never applies silently) ---------- */

const priRank: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

/** Scenario 1: reschedule missed sessions into free slots before the exam. */
export function proposeMissedReschedule(subjects: Subject[], profile: Profile, sessions: StudySession[], now: string): Adjustment | null {
  const missed = sessions.filter((s) => s.status === "missed" || (s.status === "planned" && s.date < now));
  if (!missed.length) return null;
  const keep = sessions.filter((s) => !missed.includes(s));
  const cal = makeCalendar(keep, profile);
  const add: StudySession[] = [];
  const changes: string[] = [];
  const dropped: string[] = [];
  for (const m of [...missed].sort((a, b) => priRank[b.priority] - priRank[a.priority])) {
    const subj = subjects.find((s) => s.id === m.subjectId);
    if (!subj) continue;
    const d = placeAfter(cal, now, addDays(subj.examDate, -1), m.duration);
    if (d) {
      const start = cal.place(d, m.duration);
      add.push({ ...m, id: uid(), date: d, start, status: "planned" });
      changes.push(`${subj.name} · ${m.title}: ${m.date} → ${d} ${start}`);
    } else dropped.push(`${subj.name} · ${m.title}`);
  }
  const remaining = keep.filter((s) => s.status === "planned" && s.date >= now).reduce((a, s) => a + s.duration, 0) + add.reduce((a, s) => a + s.duration, 0);
  return {
    id: uid(),
    createdAt: now,
    kind: "missed",
    title: `Reschedule ${missed.length} missed session${missed.length > 1 ? "s" : ""}`,
    reason: `Missed sessions are moved to the earliest day with free capacity (≤ ${profile.hoursPerDay}h/day) before their exam, highest priority first, without displacing existing sessions. Remaining planned workload: ${Math.round(remaining / 60)}h.${dropped.length ? ` No room before the exam for: ${dropped.join(", ")}.` : ""}`,
    changes,
    status: "proposed",
    add,
    remove: missed.map((m) => m.id),
  };
}

/** Scenario 2: struggling subject → extra revision + practice. */
export function proposeWeakSubjectBoost(subjects: Subject[], profile: Profile, sessions: StudySession[], now: string): Adjustment | null {
  const ranked = subjects.filter((s) => s.examDate > now).map((s) => ({ s, w: weaknessScore(s, sessions) })).sort((a, b) => b.w - a.w);
  const top = ranked[0];
  if (!top || top.w < 40) return null;
  const weakTopics = allTopics([top.s]).filter((r) => r.topic.status !== "not_started" && r.topic.confidence <= 3).sort((a, b) => a.topic.confidence - b.topic.confidence).slice(0, 3);
  if (!weakTopics.length) return null;
  const cal = makeCalendar(sessions.filter((s) => s.status === "planned"), profile);
  const add: StudySession[] = [];
  for (const r of weakTopics) {
    for (const [type, mins, off] of [["revise", 30, 0], ["practice", 45, 2]] as const) {
      const d = placeAfter(cal, addDays(now, off), addDays(top.s.examDate, -1), mins);
      if (d) add.push(session(r, d, cal.place(d, mins), mins, type, "high", DESC[type](r.topic.name)));
    }
  }
  if (!add.length) return null;
  return {
    id: uid(), createdAt: now, kind: "weak",
    title: `More practice for ${top.s.name}`,
    reason: `${top.s.name} has your highest struggle score (${top.w}) — based on low confidence ratings, logged difficulty and missed sessions. Adding revision and practice for: ${weakTopics.map((r) => `${r.topic.name} (confidence ${r.topic.confidence}/5)`).join(", ")}.`,
    changes: add.map((a) => `+ ${a.date} ${a.start} · ${a.type} · ${a.title} (${a.duration}m)`),
    status: "proposed", add, remove: [],
  };
}

/** Scenario 3: exam within 7 days → drop low-priority other-subject work, add revision for incomplete topics. */
export function proposeExamMode(subjects: Subject[], profile: Profile, sessions: StudySession[], now: string): Adjustment | null {
  const exam = subjects.filter((s) => { const d = daysBetween(now, s.examDate); return d > 0 && d <= 7; }).sort((a, b) => a.examDate.localeCompare(b.examDate))[0];
  if (!exam) return null;
  const window = sessions.filter((s) => s.status === "planned" && s.date >= now && s.date < exam.examDate);
  const remove = window.filter((s) => s.subjectId !== exam.id && s.priority === "low").map((s) => s.id);
  const keep = sessions.filter((s) => s.status === "planned" && !remove.includes(s.id));
  const cal = makeCalendar(keep, profile);
  const add: StudySession[] = [];
  const incomplete = allTopics([exam]).filter((r) => r.topic.status !== "done" || r.topic.confidence <= 3).sort((a, b) => topicScore(b, now) - topicScore(a, now)).slice(0, 5);
  for (const r of incomplete) {
    const d = placeAfter(cal, now, addDays(exam.examDate, -1), 40);
    if (d) add.push(session(r, d, cal.place(d, 40), 40, r.topic.status === "done" ? "revise" : "learn", "high", `Exam prep: ${r.topic.status === "done" ? DESC.revise(r.topic.name) : DESC.learn(r.topic.name)}`));
  }
  if (!add.length && !remove.length) return null;
  return {
    id: uid(), createdAt: now, kind: "exam",
    title: `Final preparation for ${exam.name}`,
    reason: `${exam.name} is in ${daysBetween(now, exam.examDate)} days with ${100 - subjectCompletion(exam)}% of the syllabus incomplete or low-confidence. Low-priority work for other subjects is paused until the exam and the freed time goes to the most important unfinished topics.`,
    changes: [
      ...remove.map((id) => { const s = sessions.find((x) => x.id === id)!; return `− ${s.date} · ${s.title} (low priority)`; }),
      ...add.map((a) => `+ ${a.date} ${a.start} · ${a.title} (${a.duration}m)`),
    ],
    status: "proposed", add, remove,
  };
}

/** Scenario 4: ahead of schedule → pull the next best topic into free time today/tomorrow. */
export function proposeAhead(subjects: Subject[], profile: Profile, sessions: StudySession[], now: string): Adjustment | null {
  const done = sessions.filter((s) => s.status === "done" && s.actualMinutes && s.date >= addDays(now, -7));
  const saved = done.reduce((a, s) => a + Math.max(0, s.duration - (s.actualMinutes ?? s.duration)), 0);
  if (saved < 30) return null;
  const scheduledLearn = new Set(sessions.filter((s) => s.type === "learn" && s.status === "planned").map((s) => s.topicId));
  const next = allTopics(subjects).filter((r) => r.topic.status === "not_started" && !scheduledLearn.has(r.topic.id) && r.subject.examDate > now).sort((a, b) => topicScore(b, now) - topicScore(a, now))[0];
  if (!next) return null;
  const cal = makeCalendar(sessions.filter((s) => s.status === "planned"), profile);
  const mins = Math.min(MAX_BLOCK, next.topic.estMinutes);
  const d = placeAfter(cal, now, addDays(now, 3), mins);
  if (!d) return null;
  const s = session(next, d, cal.place(d, mins), mins, "learn", priorityFor(topicScore(next, now)), DESC.learn(next.topic.name));
  return {
    id: uid(), createdAt: now, kind: "ahead",
    title: `You're ahead — start ${next.topic.name}`,
    reason: `You finished recent sessions ${saved} minutes faster than estimated, so future estimates are scaled by ×${personalSpeed(sessions).toFixed(2)}. The highest-priority unscheduled topic is ${next.topic.name} (${next.subject.name}).`,
    changes: [`+ ${s.date} ${s.start} · ${s.title} (${s.duration}m)`],
    status: "proposed", add: [s], remove: [],
  };
}

/** Daily recommendation with a human-readable reason. */
export function dailyRecommendation(subjects: Subject[], sessions: StudySession[], now: string) {
  const upcoming = subjects.filter((s) => s.examDate >= now).sort((a, b) => a.examDate.localeCompare(b.examDate));
  const exam = upcoming[0];
  if (!exam) return { text: "No upcoming exams. Use today for revision of low-confidence topics.", reason: "All exam dates are in the past." };
  const days = daysBetween(now, exam.examDate);
  const next = allTopics([exam]).filter((r) => r.topic.status !== "done").sort((a, b) => topicScore(b, now) - topicScore(a, now))[0];
  const weak = [...subjects].sort((a, b) => weaknessScore(b, sessions) - weaknessScore(a, sessions))[0]!;
  if (next && days <= 10) {
    return {
      text: `Your ${exam.name} exam is in ${days} day${days === 1 ? "" : "s"}. Finish ${next.topic.name} today and reserve tomorrow for practice and revision.`,
      reason: `${exam.name} is the nearest exam and is ${subjectCompletion(exam)}% complete. ${next.topic.name} has the highest priority score (difficulty ${next.topic.difficulty}/5, confidence ${next.topic.confidence}/5).`,
    };
  }
  return {
    text: `Keep steady progress, and give ${weak.name} a little extra attention this week.`,
    reason: `${weak.name} has the highest struggle score based on your confidence ratings and missed sessions. Nearest exam: ${exam.name} in ${days} days.`,
  };
}
