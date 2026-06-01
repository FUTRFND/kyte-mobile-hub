import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/income")({
  component: IncomeAlias,
});

function IncomeAlias() {
  return <Navigate to="/app/income" replace />;
}