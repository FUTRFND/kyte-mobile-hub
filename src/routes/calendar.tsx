import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/calendar")({
  component: CalendarAlias,
});

function CalendarAlias() {
  return <Navigate to="/app/calendar" replace />;
}