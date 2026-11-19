export type StudyType = "learn" | "revise" | "problems" | "practice" | "mock";
export type Priority = "high" | "medium" | "low";
export type SessionStatus = "planned" | "in_progress" | "done" | "partial" | "missed" | "skipped";
export type TopicStatus = "not_started" | "learning" | "done";
export type PrefTime = "morning" | "afternoon" | "evening" | "night";

export interface Revision { date: string; rating: number }

export interface Topic {
  id: string;
  name: string;
  difficulty: number; // 1-5
  estMinutes: number;
  spentMinutes: number;
  status: TopicStatus;
  confidence: number; // 0-5
  lastStudied?: string; // yyyy-MM-dd
  nextRevision?: string;
  needsRevision: boolean;
  revisions: Revision[];
}

export interface Chapter { id: string; name: string; topics: Topic[] }

export interface Subject {
  id: string;
  name: string;
  code: string;
  examDate: string; // yyyy-MM-dd
  difficulty: number;
  importance: number;
  color: number; // chart index 1-5
  chapters: Chapter[];
}

export interface SessionFeedback {
  completedTopic: boolean;
  difficulty: number;
  confidence: number;
  needsRevision: boolean;
}

export interface StudySession {
  id: string;
  subjectId: string;
  topicId: string;
  title: string;
  description: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  duration: number; // minutes
  priority: Priority;
  type: StudyType;
  status: SessionStatus;
  actualMinutes?: number;
  notes?: string;
  feedback?: SessionFeedback;
}

export interface Profile {
  name: string;
  college: string;
  degree: string;
  branch: string;
  year: string;
  semester: string;
  hoursPerDay: number;
  prefTime: PrefTime;
  maxSessionsPerDay: number;
  goals: string;
  level: "beginner" | "intermediate" | "advanced";
}

export interface Adjustment {
  id: string;
  createdAt: string;
  kind: "missed" | "weak" | "exam" | "ahead" | "generate" | "assistant";
  title: string;
  reason: string;
  changes: string[];
  status: "proposed" | "applied" | "dismissed";
  // sessions to add / ids to remove when applied
  add: StudySession[];
  remove: string[];
}

export const STUDY_TYPE_LABEL: Record<StudyType, string> = {
  learn: "Learn concepts",
  revise: "Revise",
  problems: "Solve problems",
  practice: "Practice questions",
  mock: "Mock test",
};
