import { addDays, today, uid } from "./dates";
import { generatePlan, nextRevisionInterval } from "./engine";
import type { Profile, StudySession, Subject, Topic } from "./types";

const T = (name: string, difficulty: number, estMinutes: number): Topic => ({
  id: uid(), name, difficulty, estMinutes, spentMinutes: 0, status: "not_started", confidence: 0, needsRevision: false, revisions: [],
});

export const demoProfile: Profile = {
  name: "Aarav Sharma", college: "Demo Institute of Technology", degree: "B.Tech", branch: "Computer Science",
  year: "3rd year", semester: "5", hoursPerDay: 4, prefTime: "evening", maxSessionsPerDay: 4,
  goals: "Score 8.5+ SGPA and finish the syllabus two weeks before exams.", level: "intermediate",
};

export function buildDemo() {
  const now = today();
  const subjects: Subject[] = [
    { id: uid(), name: "DBMS", code: "CS301", examDate: addDays(now, 6), difficulty: 3, importance: 5, color: 1, chapters: [
      { id: uid(), name: "Relational Model", topics: [T("ER diagrams", 2, 60), T("Relational algebra", 3, 90), T("SQL joins & subqueries", 3, 90)] },
      { id: uid(), name: "Normalization", topics: [T("Functional dependencies", 4, 90), T("1NF to BCNF", 4, 120)] },
      { id: uid(), name: "Transactions", topics: [T("ACID & schedules", 3, 60), T("Concurrency control", 4, 90)] },
    ]},
    { id: uid(), name: "Operating Systems", code: "CS302", examDate: addDays(now, 11), difficulty: 4, importance: 5, color: 2, chapters: [
      { id: uid(), name: "Processes", topics: [T("Process states & PCB", 2, 45), T("CPU scheduling", 4, 120)] },
      { id: uid(), name: "Synchronization", topics: [T("Semaphores & mutex", 5, 120), T("Deadlocks", 4, 90)] },
      { id: uid(), name: "Memory", topics: [T("Paging & segmentation", 4, 90), T("Page replacement", 3, 60)] },
    ]},
    { id: uid(), name: "Engineering Mathematics III", code: "MA301", examDate: addDays(now, 15), difficulty: 4, importance: 4, color: 3, chapters: [
      { id: uid(), name: "Probability", topics: [T("Random variables", 3, 60), T("Distributions", 4, 90)] },
      { id: uid(), name: "Statistics", topics: [T("Correlation & regression", 3, 60), T("Hypothesis testing", 4, 90)] },
    ]},
    { id: uid(), name: "Computer Networks", code: "CS303", examDate: addDays(now, 19), difficulty: 3, importance: 4, color: 4, chapters: [
      { id: uid(), name: "Layers", topics: [T("OSI vs TCP/IP", 2, 45), T("Data link & framing", 3, 60)] },
      { id: uid(), name: "Network layer", topics: [T("IP addressing & subnetting", 4, 90), T("Routing algorithms", 4, 90)] },
    ]},
    { id: uid(), name: "Design & Analysis of Algorithms", code: "CS304", examDate: addDays(now, 23), difficulty: 4, importance: 4, color: 5, chapters: [
      { id: uid(), name: "Paradigms", topics: [T("Divide & conquer", 3, 60), T("Greedy algorithms", 3, 60), T("Dynamic programming", 5, 150)] },
      { id: uid(), name: "Graphs", topics: [T("BFS / DFS", 2, 45), T("Shortest paths", 4, 90)] },
    ]},
  ];

  // Mark first topics of each subject as already studied (history).
  const pastDone: Array<[number, number, number, number]> = [
    // subject, chapter, topic, confidence
    [0, 0, 0, 4], [0, 0, 1, 3], [1, 0, 0, 4], [1, 0, 1, 2], [2, 0, 0, 3], [3, 0, 0, 4], [4, 0, 0, 4], [4, 1, 0, 5],
  ];
  const history: StudySession[] = [];
  pastDone.forEach(([si, ci, ti, conf], i) => {
    const s = subjects[si]!;
    const t = s.chapters[ci]!.topics[ti]!;
    const date = addDays(now, -7 + (i % 7));
    t.status = "done"; t.confidence = conf; t.spentMinutes = t.estMinutes; t.lastStudied = date;
    t.revisions = [{ date, rating: conf }];
    t.nextRevision = addDays(date, nextRevisionInterval(conf, t.difficulty, 1));
    t.needsRevision = conf <= 2;
    history.push({ id: uid(), subjectId: s.id, topicId: t.id, title: t.name, description: `Learn ${t.name}`, date, start: "18:00", duration: Math.min(90, t.estMinutes), priority: "medium", type: "learn", status: "done", actualMinutes: Math.round(Math.min(90, t.estMinutes) * (conf >= 4 ? 0.8 : 1.1)), feedback: { completedTopic: true, difficulty: t.difficulty, confidence: conf, needsRevision: conf <= 2 } });
  });
  // A partially studied OS topic and two missed sessions.
  const sem = subjects[1]!.chapters[1]!.topics[0]!;
  sem.status = "learning"; sem.confidence = 1; sem.spentMinutes = 45; sem.lastStudied = addDays(now, -2);
  history.push({ id: uid(), subjectId: subjects[1]!.id, topicId: sem.id, title: sem.name, description: "Learn semaphores", date: addDays(now, -2), start: "19:45", duration: 90, priority: "high", type: "learn", status: "partial", actualMinutes: 45, feedback: { completedTopic: false, difficulty: 5, confidence: 1, needsRevision: true }, notes: "Producer–consumer still unclear." });
  const fd = subjects[0]!.chapters[1]!.topics[0]!;
  history.push({ id: uid(), subjectId: subjects[0]!.id, topicId: fd.id, title: fd.name, description: "Learn functional dependencies", date: addDays(now, -1), start: "18:00", duration: 90, priority: "high", type: "learn", status: "missed" });
  const sched = subjects[1]!.chapters[0]!.topics[1]!;
  history.push({ id: uid(), subjectId: subjects[1]!.id, topicId: sched.id, title: `${sched.name} — problems`, description: "Gantt chart problems", date: addDays(now, -1), start: "19:45", duration: 45, priority: "medium", type: "problems", status: "missed" });

  const future = generatePlan(subjects, demoProfile, [], now, 14, history);
  return { subjects, sessions: [...history, ...future] };
}
