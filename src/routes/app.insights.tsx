import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { TabPlaceholder } from "@/components/TabPlaceholder";

export const Route = createFileRoute("/app/insights")({
  head: () => ({ meta: [{ title: "Insights — Kyte" }] }),
  component: () => (
    <TabPlaceholder
      title="Insights"
      subtitle="Where your money is going."
      icon={BarChart3}
    />
  ),
});
