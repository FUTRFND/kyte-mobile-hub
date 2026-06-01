import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
  component: HomeAlias,
});

function HomeAlias() {
  return <Navigate to="/app/home" replace />;
}