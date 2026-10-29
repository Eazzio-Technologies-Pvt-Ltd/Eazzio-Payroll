import type { Metadata } from "next";
import SimplePage from "@/components/landing/SimplePage";

export const metadata: Metadata = {
  title: "Our Story - Eazzio",
  description: "Learn about Eazzio and our enterprise field force management solution.",
};

export default function AboutPage() {
  return (
    <SimplePage
      title="Our Story"
      description="A state-of-the-art enterprise solution for tracking, managing, and optimizing on-field employee operations."
    >
      <p>
        The Eazzio Payroll is an end-to-end platform designed for organizations to seamlessly manage their distributed mobile workforce. It offers powerful real-time tracking, attendance logging, dynamic geofencing, robust task management, and deep analytical insights, all wrapped in a premium, role-based user interface.
      </p>
      <p>
        Whether you&apos;re managing a small local team or a massive regional sales force, Eazzio acts as your central command center, bridging the gap between field agents and administrative managers.
      </p>
    </SimplePage>
  );
}
