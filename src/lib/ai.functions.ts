import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AiSessionDraft { subjectId: string; topicId: string; title: string; description: string; date: string; start: string; duration: number; type: "learn" | "revise" | "problems" | "practice" | "mock"; priority: "high" | "medium" | "low" }
export interface AssistantResult { reply: string; proposal: { title: string; reason: string; add: AiSessionDraft[]; removeIds: string[] } | null }
export interface ParsedSyllabus { subjects: { name: string; code: string; chapters: { name: string; topics: { name: string; difficulty: number; estMinutes: number }[] }[] }[] }

const sessionSchema = {
  type: "object", additionalProperties: false,
  required: ["subjectId", "topicId", "title", "description", "date", "start", "duration", "type", "priority"],
  properties: {
    subjectId: { type: "string" }, topicId: { type: "string" }, title: { type: "string" }, description: { type: "string" },
    date: { type: "string", description: "yyyy-MM-dd" }, start: { type: "string", description: "HH:mm 24h" },
    duration: { type: "integer" }, type: { type: "string", enum: ["learn", "revise", "problems", "practice", "mock"] },
    priority: { type: "string", enum: ["high", "medium", "low"] },
  },
};
const assistantSchema = {
  type: "object", additionalProperties: false, required: ["reply", "proposal"],
  properties: {
    reply: { type: "string" },
    proposal: {
      anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["title", "reason", "add", "removeIds"], properties: {
        title: { type: "string" }, reason: { type: "string" }, add: { type: "array", items: sessionSchema }, removeIds: { type: "array", items: { type: "string" } },
      } }],
    },
  },
};

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string; history: { role: "user" | "assistant"; content: string }[]; context: string }) => {
    if (!d?.message || d.message.length > 4000) throw new Error("Message is empty or too long.");
    if (d.context.length > 60000) throw new Error("Study context too large.");
    return d;
  })
  .handler(async ({ data }) => {
    const { gatewayJSON, GatewayError } = await import("@/server/gateway.server");
    const system = `You are ThinkFlow, a study-planning assistant for a college student. You ONLY help with study planning, prioritisation, revision and exam preparation using the student's real data below. Be concise, concrete and kind. Explain the reasoning behind priorities (exam dates, difficulty, confidence, missed work).
When the student asks to create, fix, optimise or reorganise their schedule, return a proposal with concrete sessions using ONLY subjectId/topicId values from the data, dates from today onward, start times in HH:mm, durations 30-90 min, and never exceed their daily hours or max sessions per day (count existing planned sessions on that day; remove sessions via removeIds to make room when needed). Otherwise proposal must be null. The student must approve proposals, so describe them in the reply.
STUDENT DATA (JSON):\n${data.context}`;
    const convo = data.history.slice(-8).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    try {
      return { ok: true as const, result: await gatewayJSON<AssistantResult>(system, `${convo}\nUSER: ${data.message}`, "assistant_reply", assistantSchema) };
    } catch (e) {
      return { ok: false as const, status: e instanceof GatewayError ? e.status : 500, error: e instanceof Error ? e.message : "AI request failed." };
    }
  });

const syllabusSchema = {
  type: "object", additionalProperties: false, required: ["subjects"],
  properties: { subjects: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "code", "chapters"], properties: {
    name: { type: "string" }, code: { type: "string" },
    chapters: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "topics"], properties: {
      name: { type: "string" },
      topics: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "difficulty", "estMinutes"], properties: {
        name: { type: "string" }, difficulty: { type: "integer", description: "1-5" }, estMinutes: { type: "integer", description: "30-180" },
      } } },
    } } },
  } } } },
};

export const parseSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => {
    if (!d?.text || d.text.trim().length < 20) throw new Error("Paste more syllabus text.");
    return { text: d.text.slice(0, 40000) };
  })
  .handler(async ({ data }) => {
    const { gatewayJSON, GatewayError } = await import("@/server/gateway.server");
    try {
      const result = await gatewayJSON<ParsedSyllabus>(
        "Extract a university syllabus into subjects → chapters (units/modules) → topics. Keep topic names short. Estimate difficulty 1-5 for an average undergraduate and study minutes 30-180. Use empty string for unknown subject code. Do not invent topics not in the text.",
        data.text, "syllabus", syllabusSchema);
      return { ok: true as const, result: JSON.stringify(result) };
    } catch (e) {
      return { ok: false as const, status: e instanceof GatewayError ? e.status : 500, error: e instanceof Error ? e.message : "AI request failed." };
    }
  });

const S = { type: "string" };
const arr = (items: object) => ({ type: "array", items });
const obj = (props: Record<string, object>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
const contentJsonSchema = obj({
  introduction: S, objectives: arr(S), sections: arr(obj({ title: S, body: S })), definitions: arr(obj({ term: S, meaning: S })),
  examples: arr(S), formulas: arr(S), applications: arr(S), notes: arr(S), importantQuestions: arr(obj({ question: S, answer: S })),
  questions: arr(obj({ question: S, options: arr(S), correctIndex: { type: "integer" }, explanation: S, difficulty: { type: "string", enum: ["basic", "intermediate", "advanced"] } })),
});
export const generateTopicContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; chapter: string; topic: string }) => {
    const clean = (v: unknown) => String(v ?? "").trim().slice(0, 200);
    const r = { subject: clean(d?.subject), chapter: clean(d?.chapter), topic: clean(d?.topic) };
    if (!r.subject || !r.topic) throw new Error("Choose a topic first.");
    return r;
  })
  .handler(async ({ data }) => {
    const { gatewayJSON, GatewayError } = await import("@/server/gateway.server");
    try {
      const result = await gatewayJSON<unknown>(
        "You write accurate, exam-oriented study material for B.Tech CSE university students. Stay strictly on the given topic. Produce: introduction, 3-5 objectives, 3-6 explanation sections, definitions, examples, formulas (empty array if none), real-world applications, 5-10 concise short notes, 3-5 important exam questions with answers, and exactly 6 MCQs each with 4 distinct options, exactly one correct option (correctIndex 0-3), an explanation, and a difficulty. Never invent facts.",
        `Subject: ${data.subject}\nChapter: ${data.chapter}\nTopic: ${data.topic}`, "topic_content", contentJsonSchema);
      return { ok: true as const, result: JSON.stringify(result) };
    } catch (e) {
      return { ok: false as const, status: e instanceof GatewayError ? e.status : 500, error: e instanceof Error ? e.message : "AI request failed." };
    }
  });return { ok: true as const, result: JSON.stringify(result) };stack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AiSessionDraft { subjectId: string; topicId: string; title: string; description: string; date: string; start: string; duration: number; type: "learn" | "revise" | "problems" | "practice" | "mock"; priority: "high" | "medium" | "low" }
export interface AssistantResult { reply: string; proposal: { title: string; reason: string; add: AiSessionDraft[]; removeIds: string[] } | null }
export interface ParsedSyllabus { subjects: { name: string; code: string; chapters: { name: string; topics: { name: string; difficulty: number; estMinutes: number }[] }[] }[] }

const sessionSchema = {
  type: "object", additionalProperties: false,
  required: ["subjectId", "topicId", "title", "description", "date", "start", "duration", "type", "priority"],
  properties: {
    subjectId: { type: "string" }, topicId: { type: "string" }, title: { type: "string" }, description: { type: "string" },
    date: { type: "string", description: "yyyy-MM-dd" }, start: { type: "string", description: "HH:mm 24h" },
    duration: { type: "integer" }, type: { type: "string", enum: ["learn", "revise", "problems", "practice", "mock"] },
    priority: { type: "string", enum: ["high", "medium", "low"] },
  },
};
const assistantSchema = {
  type: "object", additionalProperties: false, required: ["reply", "proposal"],
  properties: {
    reply: { type: "string" },
    proposal: {
      anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["title", "reason", "add", "removeIds"], properties: {
        title: { type: "string" }, reason: { type: "string" }, add: { type: "array", items: sessionSchema }, removeIds: { type: "array", items: { type: "string" } },
      } }],
    },
  },
};

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string; history: { role: "user" | "assistant"; content: string }[]; context: string }) => {
    if (!d?.message || d.message.length > 4000) throw new Error("Message is empty or too long.");
    if (d.context.length > 60000) throw new Error("Study context too large.");
    return d;
  })
  .handler(async ({ data }) => {
    const { gatewayJSON, GatewayError } = await import("@/server/gateway.server");
    const system = `You are ThinkFlow, a study-planning assistant for a college student. You ONLY help with study planning, prioritisation, revision and exam preparation using the student's real data below. Be concise, concrete and kind. Explain the reasoning behind priorities (exam dates, difficulty, confidence, missed work).
When the student asks to create, fix, optimise or reorganise their schedule, return a proposal with concrete sessions using ONLY subjectId/topicId values from the data, dates from today onward, start times in HH:mm, durations 30-90 min, and never exceed their daily hours or max sessions per day (count existing planned sessions on that day; remove sessions via removeIds to make room when needed). Otherwise proposal must be null. The student must approve proposals, so describe them in the reply.
STUDENT DATA (JSON):\n${data.context}`;
    const convo = data.history.slice(-8).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    try {
      return { ok: true as const, result: await gatewayJSON<AssistantResult>(system, `${convo}\nUSER: ${data.message}`, "assistant_reply", assistantSchema) };
    } catch (e) {
      return { ok: false as const, status: e instanceof GatewayError ? e.status : 500, error: e instanceof Error ? e.message : "AI request failed." };
    }
  });

const syllabusSchema = {
  type: "object", additionalProperties: false, required: ["subjects"],
  properties: { subjects: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "code", "chapters"], properties: {
    name: { type: "string" }, code: { type: "string" },
    chapters: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "topics"], properties: {
      name: { type: "string" },
      topics: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "difficulty", "estMinutes"], properties: {
        name: { type: "string" }, difficulty: { type: "integer", description: "1-5" }, estMinutes: { type: "integer", description: "30-180" },
      } } },
    } } },
  } } } },
};

export const parseSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => {
    if (!d?.text || d.text.trim().length < 20) throw new Error("Paste more syllabus text.");
    return { text: d.text.slice(0, 40000) };
  })
  .handler(async ({ data }) => {
    const { gatewayJSON, GatewayError } = await import("@/server/gateway.server");
    try {
      const result = await gatewayJSON<ParsedSyllabus>(
        "Extract a university syllabus into subjects → chapters (units/modules) → topics. Keep topic names short. Estimate difficulty 1-5 for an average undergraduate and study minutes 30-180. Use empty string for unknown subject code. Do not invent topics not in the text.",
        data.text, "syllabus", syllabusSchema);
      return { ok: true as const, result: JSON.stringify(result) };
    } catch (e) {
      return { ok: false as const, status: e instanceof GatewayError ? e.status : 500, error: e instanceof Error ? e.message : "AI request failed." };
    }
  });

const S = { type: "string" };
const arr = (items: object) => ({ type: "array", items });
const obj = (props: Record<string, object>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
const contentJsonSchema = obj({
  introduction: S, objectives: arr(S), sections: arr(obj({ title: S, body: S })), definitions: arr(obj({ term: S, meaning: S })),
  examples: arr(S), formulas: arr(S), applications: arr(S), notes: arr(S), importantQuestions: arr(obj({ question: S, answer: S })),
  questions: arr(obj({ question: S, options: arr(S), correctIndex: { type: "integer" }, explanation: S, difficulty: { type: "string", enum: ["basic", "intermediate", "advanced"] } })),
});
export const generateTopicContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; chapter: string; topic: string }) => {
    const clean = (v: unknown) => String(v ?? "").trim().slice(0, 200);
    const r = { subject: clean(d?.subject), chapter: clean(d?.chapter), topic: clean(d?.topic) };
    if (!r.subject || !r.topic) throw new Error("Choose a topic first.");
    return r;
  })
  .handler(async ({ data }) => {
    const { gatewayJSON, GatewayError } = await import("@/server/gateway.server");
    try {
      const result = await gatewayJSON<unknown>(
        "You write accurate, exam-oriented study material for B.Tech CSE university students. Stay strictly on the given topic. Produce: introduction, 3-5 objectives, 3-6 explanation sections, definitions, examples, formulas (empty array if none), real-world applications, 5-10 concise short notes, 3-5 important exam questions with answers, and exactly 6 MCQs each with 4 distinct options, exactly one correct option (correctIndex 0-3), an explanation, and a difficulty. Never invent facts.",
        `Subject: ${data.subject}\nChapter: ${data.chapter}\nTopic: ${data.topic}`, "topic_content", contentJsonSchema);
      return { ok: true as const, result: JSON.stringify(result) };
    } catch (e) {
      return { ok: false as const, status: e instanceof GatewayError ? e.status : 500, error: e instanceof Error ? e.message : "AI request failed." };
    }
  });

const S = { type: "string" };
const arr = (items: object) => ({ type: "array", items });
const obj = (props: Record<string, object>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
const contentJsonSchema = obj({
  introduction: S, objectives: arr(S), sections: arr(obj({ title: S, body: S })), definitions: arr(obj({ term: S, meaning: S })),
  examples: arr(S), formulas: arr(S), applications: arr(S), notes: arr(S), importantQuestions: arr(obj({ question: S, answer: S })),
  questions: arr(obj({ question: S, options: arr(S), correctIndex: { type: "integer" }, explanation: S, difficulty: { type: "string", enum: ["basic", "intermediate", "advanced"] } })),
});
export const generateTopicContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; chapter: string; topic: string }) => {
    const clean = (v: unknown) => String(v ?? "").trim().slice(0, 200);
    const r = { subject: clean(d?.subject), chapter: clean(d?.chapter), topic: clean(d?.topic) };
    if (!r.subject || !r.topic) throw new Error("Choose a topic first.");
    return r;
  })
  .handler(async ({ data }) => {
    const { gatewayJSON, GatewayError } = await import("@/server/gateway.server");
    try {
      const result = await gatewayJSON<unknown>(
        "You write accurate, exam-oriented study material for B.Tech CSE university students. Stay strictly on the given topic. Produce: introduction, 3-5 objectives, 3-6 explanation sections, definitions, examples, formulas (empty array if none), real-world applications, 5-10 concise short notes, 3-5 important exam questions with answers, and exactly 6 MCQs each with 4 distinct options, exactly one correct option (correctIndex 0-3), an explanation, and a difficulty. Never invent facts.",
        `Subject: ${data.subject}\nChapter: ${data.chapter}\nTopic: ${data.topic}`, "topic_content", contentJsonSchema);
      return { ok: true as const, result: JSON.stringify(result) };
    } catch (e) {
      return { ok: false as const, status: e instanceof GatewayError ? e.status : 500, error: e instanceof Error ? e.message : "AI request failed." };
    }
  });
