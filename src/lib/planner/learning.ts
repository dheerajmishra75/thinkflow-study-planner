import { z } from 'zod';
import { addDays } from './dates';
import type { Subject, Topic } from './types';

export const questionSchema = z.object({
  id: z.string().min(1), topicId: z.string().min(1), question: z.string().min(10).max(1200),
  options: z.array(z.string().min(1).max(500)).length(4).refine(v => new Set(v.map(s => s.trim().toLowerCase())).size === 4, 'Answers must be distinct.'),
  correctIndex: z.number().int().min(0).max(3), explanation: z.string().min(10).max(2000),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
});
export const contentSchema = z.object({
  introduction: z.string().min(30).max(4000), objectives: z.array(z.string().min(5)).min(2).max(8),
  sections: z.array(z.object({ title: z.string().min(3), body: z.string().min(30).max(6000) })).min(2).max(12),
  definitions: z.array(z.object({ term: z.string().min(1), meaning: z.string().min(10) })).min(1).max(15),
  examples: z.array(z.string().min(15)).min(1).max(8), formulas: z.array(z.string()).max(10),
  applications: z.array(z.string().min(10)).min(1).max(8), notes: z.array(z.string().min(10)).min(3).max(20),
  importantQuestions: z.array(z.object({ question: z.string().min(10), answer: z.string().min(20) })).min(2).max(10),
  questions: z.array(questionSchema).min(5).max(20).refine(q => new Set(q.map(x => x.id)).size === q.length && new Set(q.map(x => x.question.trim().toLowerCase())).size === q.length, 'Questions must be unique.'),
});
export type QuizQuestion = z.infer<typeof questionSchema>;
export type LearningBody = z.infer<typeof contentSchema>;
export type TopicContent = LearningBody & { topicId: string; source: 'demo' | 'ai'; generatedAt: string; syllabusKey: string };
export interface LearningProgress { bookmarked: boolean; materialComplete: boolean; savedNotes: string; lastOpened: string }
export type QuizMode = 'topic' | 'chapter' | 'revision' | 'session';
export interface QuizAnswer { question: QuizQuestion; selected: number | null; correct: boolean }
export interface QuizAttempt { id: string; mode: QuizMode; sessionId?: string; at: string; seconds: number; answers: QuizAnswer[]; total: number; correct: number; accuracy: number }
export const syllabusKey = (subject: string, chapter: string, topic: string) => JSON.stringify([subject.trim(), chapter.trim(), topic.trim()]);

export function validateContent(input: unknown, topicId: string): LearningBody {
  const result = contentSchema.parse(input);
  if (result.questions.some(q => q.topicId !== topicId)) throw new Error('Questions do not match the selected syllabus topic.');
  return result;
}
export function scoreQuiz(questions: QuizQuestion[], selected: Record<string, number | null>) {
  if (!questions.length) throw new Error('A test needs questions.');
  const answers = questions.map(question => {
    const choice = selected[question.id];
    const valid = typeof choice === 'number' && Number.isInteger(choice) && choice >= 0 && choice < 4;
    return { question, selected: valid ? choice : null, correct: valid && choice === question.correctIndex };
  });
  const correct = answers.filter(a => a.correct).length;
  return { answers, total: answers.length, correct, accuracy: Math.round(correct / answers.length * 100) };
}
export function topicPerformance(attempt: QuizAttempt) {
  return [...new Set(attempt.answers.map(a => a.question.topicId))].map(topicId => {
    const answers = attempt.answers.filter(a => a.question.topicId === topicId);
    const correct = answers.filter(a => a.correct).length;
    return { topicId, total: answers.length, correct, accuracy: Math.round(correct / answers.length * 100) };
  });
}
export function learningLevel(topic: Topic, attempts: QuizAttempt[]): 'Not tested' | 'Needs revision' | 'Developing' | 'Strong understanding' {
  const recent = attempts.filter(a => a.answers.some(x => x.question.topicId === topic.id)).slice(-3);
  if (!recent.length) return 'Not tested';
  const scores = recent.map(a => topicPerformance(a).find(r => r.topicId === topic.id)?.accuracy ?? 0);
  if ((scores.at(-1) ?? 0) < 60 || topic.needsRevision) return 'Needs revision';
  if (scores.length >= 2 && scores.slice(-2).every(s => s >= 80) && topic.confidence >= 4) return 'Strong understanding';
  return 'Developing';
}
export function updateFromAssessment(topic: Topic, accuracy: number, previous: QuizAttempt[], date: string): Topic {
  const prior = previous.filter(a => a.answers.some(x => x.question.topicId === topic.id)).at(-1);
  const priorScore = prior ? topicPerformance(prior).find(x => x.topicId === topic.id)?.accuracy : undefined;
  const repeatedLow = accuracy < 60 && priorScore !== undefined && priorScore < 60;
  const confidence = Math.max(1, Math.min(5, Math.round((topic.confidence + accuracy / 20) / 2)));
  // An objective result does not complete a syllabus topic or erase the student's study log.
  return { ...topic, confidence, needsRevision: accuracy < 80 || repeatedLow,
    nextRevision: addDays(date, accuracy < 60 ? 1 : accuracy < 80 ? 2 : 4) };
}
export function chooseQuestions(contents: TopicContent[], mode: QuizMode): QuizQuestion[] {
  const queues = contents.map(c => [...c.questions]);
  const result: QuizQuestion[] = [];
  const max = mode === 'session' || mode === 'topic' ? 5 : mode === 'revision' ? 5 : 10;
  // Round-robin keeps a chapter test representative of every available topic.
  while (result.length < max && queues.some(q => q.length)) for (const queue of queues) {
    const q = queue.shift(); if (q && result.length < max) result.push(q);
  }
  return result;
}
export function pruneLearning(subjects: Subject[], content: Record<string, TopicContent>, progress: Record<string, LearningProgress>) {
  const ids = new Set(subjects.flatMap(s => s.chapters.flatMap(c => c.topics.map(t => t.id))));
  return { content: Object.fromEntries(Object.entries(content).filter(([id]) => ids.has(id))), learningProgress: Object.fromEntries(Object.entries(progress).filter(([id]) => ids.has(id))) };
}