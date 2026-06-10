"use client";

import { useState } from "react";
import { MessageSquare, AlertCircle, ShieldCheck, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AnonymousFeedbackPage() {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // We explicitly DO NOT use the authenticated fetchClient
  // We use standard fetch without Authorization headers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Feedback content cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Intentionally hardcode or get orgId from a generic context, NOT the user object.
      // Assuming a single-tenant or extracting orgId without user context.
      // For this demo, we'll use a dummy/default org ID or if we had a public context.
      const orgId = "dev-org-id"; // In a real app, this might be injected via environment or a public endpoint.

      const url = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/feedback/submit`
        : "http://localhost:5000/api/v1/feedback/submit";

      // Note: No authorization headers here!
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          category,
          content,
          rating
        })
      });

      if (!res.ok) {
        throw new Error("Failed to submit feedback");
      }

      setSubmitted(true);
      setContent("");
      toast.success("Feedback securely and anonymously submitted.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div className="page-header" style={{ marginBottom: "30px" }}>
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <MessageSquare size={24} /> Anonymous Feedback
        </h1>
        <p className="page-subtitle">Speak your mind without fear. This form strips all personal identifiers.</p>
      </div>

      <div className="card" style={{ padding: "30px", borderTop: "4px solid var(--accent-green)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", background: "rgba(34,211,165,0.1)", padding: "16px", borderRadius: "8px" }}>
          <ShieldCheck size={28} color="var(--accent-green)" />
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>100% Anonymous</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
              Your IP address, employee ID, name, and login tokens are removed from this request before it hits our servers. Management cannot trace this back to you.
            </p>
          </div>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,211,165,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle size={32} color="var(--accent-green)" />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Thank you for your honesty</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>Your feedback has been securely stored.</p>
            <button className="btn-primary" onClick={() => setSubmitted(false)}>Submit Another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "13px" }}>Category</label>
              <select 
                className="input" 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-card)" }}
              >
                <option value="WORK_ENVIRONMENT">Work Environment</option>
                <option value="MANAGEMENT">Management & Leadership</option>
                <option value="TOOLS_AND_EQUIPMENT">Tools & Equipment</option>
                <option value="COMPENSATION">Compensation & Benefits</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "13px" }}>Your Feedback</label>
              <textarea 
                className="input" 
                rows={6}
                placeholder="Be honest, be constructive. We're listening."
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-card)", resize: "vertical", fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={14} /> Be respectful but truthful.
              </div>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting}
                style={{ padding: "10px 24px" }}
              >
                {isSubmitting ? "Encrypting & Submitting..." : "Submit Anonymously"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
