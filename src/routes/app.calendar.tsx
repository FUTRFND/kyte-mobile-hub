import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { TabPlaceholder } from "@/components/TabPlaceholder";

export const Route = createFileRoute("/app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Kyte" }] }),
  component: () => (
    <TabPlaceholder
      title="Calendar"
      subtitle="Due dates across every account."
      icon={CalendarDays}
    />
  ),
});
