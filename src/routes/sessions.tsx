import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [{ title: "Study Sessions — ThinkFlow AI" }, { name: "description", content: "Study Sessions in ThinkFlow AI." }, { property: "og:title", content: "Study Sessions — ThinkFlow AI" }, { property: "og:description", content: "Study Sessions in ThinkFlow AI." }] }),
  component: () => (
    <div className="max-w-lg">
      <p className="eyebrow">Not built yet</p>
      <h1 className="mt-1.5 text-2xl font-semibold">Study Sessions</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page is not finished yet. Use the dashboard for today's plan and adaptive suggestions.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">Back to dashboard</Link>
    </div>
  ),
});
