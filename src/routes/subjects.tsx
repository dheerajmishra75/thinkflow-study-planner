import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/subjects")({
  head: () => ({ meta: [{ title: "Subjects & Syllabus — ThinkFlow AI" }, { name: "description", content: "Subjects & Syllabus in ThinkFlow AI." }, { property: "og:title", content: "Subjects & Syllabus — ThinkFlow AI" }, { property: "og:description", content: "Subjects & Syllabus in ThinkFlow AI." }] }),
  component: () => (
    <div className="max-w-lg">
      <p className="eyebrow">Not built yet</p>
      <h1 className="mt-1.5 text-2xl font-semibold">Subjects & Syllabus</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page is not finished yet. Use the dashboard for today's plan and adaptive suggestions.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">Back to dashboard</Link>
    </div>
  ),
});
