import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/accounts")({
  component: AccountsAlias,
});

function AccountsAlias() {
  return <Navigate to="/app/accounts" replace />;
}