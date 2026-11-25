"use client";
import TasksView from "@/components/tasks/TasksView";
import { GlassBackground } from "@/components/ui/glass-background";

export default function TasksPage() {
  return (
    <GlassBackground variant="data">
      <TasksView />
    </GlassBackground>
  );
}
