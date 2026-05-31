import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { TabPlaceholder } from "@/components/TabPlaceholder";

export const Route = createFileRoute("/app/home")({
  head: () => ({ meta: [{ title: "Home — Kyte" }] }),
  component: () => (
    <TabPlaceholder
      title="Home"
      subtitle="Your bills at a glance."
      icon={Home}
    />
  ),
});
