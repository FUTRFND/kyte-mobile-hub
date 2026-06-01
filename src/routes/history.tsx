import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  component: HistoryAlias,
});

function HistoryAlias() {
  return <Navigate to="/app/history" replace />;
}