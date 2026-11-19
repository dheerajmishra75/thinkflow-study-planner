import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Profile & Settings — ThinkFlow AI" }, { name: "description", content: "Profile & Settings in ThinkFlow AI." }, { property: "og:title", content: "Profile & Settings — ThinkFlow AI" }, { property: "og:description", content: "Profile & Settings in ThinkFlow AI." }] }),
  component: () => (
    <div className="max-w-lg">
      <p className="eyebrow">Not built yet</p>
      <h1 className="mt-1.5 text-2xl font-semibold">Profile & Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page is not finished yet. Use the dashboard for today's plan and adaptive suggestions.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">Back to dashboard</Link>
    </div>
  ),
});
