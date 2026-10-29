import type { Metadata } from "next";
import SimplePage from "@/components/landing/SimplePage";

export const metadata: Metadata = {
  title: "Blog - Eazzio",
  description: "Latest insights, news, and updates from Eazzio.",
};

export default function BlogPage() {
  return (
    <SimplePage
      title="Blog"
      description="Latest insights, updates, and best practices in field operations."
    >
      <p>Coming soon.</p>
    </SimplePage>
  );
}
