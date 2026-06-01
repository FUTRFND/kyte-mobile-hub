import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  component: ProfileAlias,
});

function ProfileAlias() {
  return <Navigate to="/app/profile" replace />;
}