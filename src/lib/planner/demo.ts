import { addDays, today, uid } from "./dates";
import { generatePlan, nextRevisionInterval } from "./engine";
import { buildLearningDemo } from "./learning-demo";
import type { Profile, StudySession, Subject, Topic } from "./types";

const T = (name: string, difficulty: number, estMinutes: number): Topic => ({
  id: uid(), name, difficulty, estMinutes, spentMinutes: 0, status: "not_started", confidence: 0, needsRevision: false, revisions: [],
});

export const demoProfile: Profile = {
  name: "Aarav Sharma", college: "Demo Institute of Technology", degree: "B.Tech",
  branch: "Computer Science & Engineering", year: "3rd year", semester: "5",
  hoursPerDay: 4, prefTime: "evening", maxSessionsPerDay: 4,
  goals: "Score 8.5+ SGPA and finish the syllabus two weeks before exams.", level: "intermediate",
};

export function buildDemo() {
  const now = today();
  const subjects: Subject[] = [
    { id: uid(), name: "Database Management Systems", code: "CS301", examDate: addDays(now, 6), difficulty: 3, importance: 5, color: 1, chapters: [
      { id: uid(), name: "Relational Model", topics: [T("ER diagrams", 2, 60), T("SQL Joins & Queries", 3, 90), T("Indexing", 4, 90)] },
      { id: uid(), name: "Normalization", topics: [T("Functional dependencies", 4, 90), T("Normalization", 4, 120)] },
      { id: uid(), name: "Transactions", topics: [T("ACID & schedules", 3, 60), T("Concurrency control", 4, 90)] },
    ]},
    { id: uid(), name: "Operating Systems", code: "CS302", examDate: addDays(now, 14), difficulty: 4, importance: 5, color: 2, chapters: [
      { id: uid(), name: "Processes", topics: [T("Process states & PCB", 2, 45), T("CPU scheduling", 4, 120)] },
      { id: uid(), name: "Process Synchronization", topics: [T("Semaphores & mutex", 5, 120), T("Deadlocks", 4, 90)] },
      { id: uid(), name: "Virtual Memory", topics: [T("Virtual Memory", 4, 90), T("Page replacement", 3, 60)] },
    ]},
    { id: uid(), name: "Computer Networks", code: "CS303", examDate: addDays(now, 22), difficulty: 3, importance: 4, color: 3, chapters: [
      { id: uid(), name: "Network Models", topics: [T("TCP/IP & OSI Model", 2, 60), T("Data link & framing", 3, 60)] },
      { id: uid(), name: "Network Layer", topics: [T("IP addressing & subnetting", 4, 90), T("Routing algorithms", 4, 90)] },
    ]},
    { id: uid(), name: "Artificial Intelligence", code: "CS304", examDate: addDays(now, 30), difficulty: 4, importance: 4, color: 4, chapters: [
      { id: uid(), name: "Heuristic Search", topics: [T("Heuristic Search (A*)", 4, 90)] },
      { id: uid(), name: "Adversarial Search", topics: [T("Minimax", 4, 90)] },
    ]},
    { id: uid(), name: "Discrete Mathematics", code: "MA301", examDate: addDays(now, 30), difficulty: 3, importance: 3, color: 5, chapters: [
      { id: uid(), name: "Logic and Graphs", topics: [T("Graph Theory", 3, 60), T("Propositional Logic", 3, 60)] },
      { id: uid(), name: "Combinatorics and Probability", topics: [T("Combinatorics", 3, 60), T("Distributions", 3, 60)] },
    ]},
  ];

  const history: StudySession[] = [];
  const completeTopic = (subjectIndex: number, chapterIndex: number, topicIndex: number, confidence: number, daysAgo: number) => {
    const subject = subjects[subjectIndex];
    const topic = subject?.chapters[chapterIndex]?.topics[topicIndex];
    if (!subject || !topic) throw new Error("Demo syllabus is incomplete.");
    const date = addDays(now, -daysAgo);
    topic.status = "done";
    topic.confidence = confidence;
    topic.spentMinutes = topic.estMinutes;
    topic.lastStudied = date;
    topic.revisions = [{ date, rating: confidence }];
    topic.nextRevision = addDays(date, nextRevisionInterval(confidence, topic.difficulty, 1));
    topic.needsRevision = confidence <= 2;
    history.push({
      id: uid(), subjectId: subject.id, topicId: topic.id, title: topic.name,
      description: `Learn ${topic.name}`, date, start: "18:00",
      duration: Math.min(90, topic.estMinutes), priority: "medium", type: "learn",
      status: "done", actualMinutes: Math.min(90, topic.estMinutes),
      feedback: { completedTopic: true, difficulty: topic.difficulty, confidence, needsRevision: topic.needsRevision },
    });
  };

  completeTopic(0, 0, 1, 5, 3);
  completeTopic(2, 0, 0, 4, 4);
  for (const [chapterIndex, topicIndex] of [[0, 0], [0, 1], [1, 0], [1, 1]] as const) {
    completeTopic(4, chapterIndex, topicIndex, 5, 2 + chapterIndex);
  }
  for (const topic of subjects[4]?.chapters.flatMap(chapter => chapter.topics) ?? []) {
    topic.status = "done";
    topic.confidence = 5;
    topic.needsRevision = false;
  }

  const dbms = subjects[0];
  const os = subjects[1];
  const normalization = dbms?.chapters[1]?.topics[1];
  const indexing = dbms?.chapters[0]?.topics[2];
  const semaphores = os?.chapters[1]?.topics[0];
  const virtualMemory = os?.chapters[2]?.topics[0];
  const routing = subjects[2]?.chapters[1]?.topics[1];
  if (!dbms || !os || !normalization || !indexing || !semaphores || !virtualMemory || !routing) {
    throw new Error("Demo syllabus is incomplete.");
  }
  normalization.status = "learning";
  normalization.confidence = 1;
  normalization.spentMinutes = 45;
  normalization.needsRevision = true;
  normalization.nextRevision = now;
  normalization.lastStudied = addDays(now, -2);
  indexing.status = "learning";
  indexing.confidence = 2;
  indexing.spentMinutes = 30;
  semaphores.status = "learning";
  semaphores.confidence = 2;
  semaphores.spentMinutes = 60;
  semaphores.needsRevision = true;
  semaphores.nextRevision = now;
  virtualMemory.status = "learning";
  virtualMemory.confidence = 2;
  virtualMemory.spentMinutes = 35;
  routing.status = "learning";
  routing.confidence = 2;
  routing.spentMinutes = 30;

  history.push(
    { id: uid(), subjectId: os.id, topicId: semaphores.id, title: semaphores.name, description: "Work through semaphore coordination", date: addDays(now, -2), start: "19:45", duration: 90, priority: "high", type: "learn", status: "partial", actualMinutes: 60, feedback: { completedTopic: false, difficulty: 5, confidence: 2, needsRevision: true }, notes: "Review producer-consumer synchronization." },
    { id: uid(), subjectId: dbms.id, topicId: normalization.id, title: normalization.name, description: "Review normalization forms", date: addDays(now, -1), start: "18:00", duration: 90, priority: "high", type: "learn", status: "missed" },
  );

  const sessions = [...history, ...generatePlan(subjects, demoProfile, [], now, 14, history)];
  return { subjects, sessions, ...buildLearningDemo(subjects, now) };
}
