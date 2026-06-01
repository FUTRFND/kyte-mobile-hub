import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/insights")({
  component: InsightsAlias,
});

function InsightsAlias() {
  return <Navigate to="/app/insights" replace />;
}