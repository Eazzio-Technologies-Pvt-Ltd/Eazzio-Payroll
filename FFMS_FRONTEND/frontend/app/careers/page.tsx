import type { Metadata } from "next";
import SimplePage from "@/components/landing/SimplePage";

export const metadata: Metadata = {
  title: "Careers - Eazzio",
  description: "Career opportunities at Eazzio.",
};

export default function CareersPage() {
  return (
    <SimplePage
      title="Careers"
      description="Join our team building modern field force management tools."
    >
      <p>No open positions right now.</p>
    </SimplePage>
  );
}
