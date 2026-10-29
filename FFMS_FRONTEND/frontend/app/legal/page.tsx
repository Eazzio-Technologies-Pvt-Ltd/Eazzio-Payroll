import type { Metadata } from "next";
import SimplePage from "@/components/landing/SimplePage";

export const metadata: Metadata = {
  title: "Legal - Eazzio",
  description: "Legal policies and terms for Eazzio.",
};

export default function LegalPage() {
  {/* TODO: Real Privacy Policy and Terms of Service must come from the company. Do not write policy text without legal review. */}
  return (
    <SimplePage
      title="Legal"
      description="Terms of service and legal information."
    >
      {/* TODO: Real Privacy Policy/Terms must come from the company. Do NOT write policy text. */}
      <p>Legal documents coming soon.</p>
    </SimplePage>
  );
}
