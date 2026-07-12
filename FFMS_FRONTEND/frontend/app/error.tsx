"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global UI Crash:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "var(--bg-primary, #faf8ff)"
    }}>
      <div className="card" style={{
        maxWidth: "500px",
        width: "100%",
        textAlign: "center",
        padding: "40px 30px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px"
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "rgba(186, 26, 26, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent-red, #ba1a1a)"
        }}>
          <AlertTriangle size={40} />
        </div>
        
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 10px 0", color: "var(--text-primary)" }}>
            Something went wrong!
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
            We've encountered an unexpected error while rendering this page. Our engineering team has been notified.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div style={{
            width: "100%",
            padding: "16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            textAlign: "left",
            overflowX: "auto",
            marginTop: "10px"
          }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: 700, fontSize: "12px", color: "#991b1b" }}>Developer Error Details:</p>
            <pre style={{ fontSize: "11px", color: "#b91c1c", margin: 0, fontFamily: "monospace" }}>
              {error.message}
            </pre>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "10px" }}>
          <button 
            className="btn-secondary" 
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => router.push("/")}
          >
            <Home size={16} /> Go Home
          </button>
          <button 
            className="btn-primary" 
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => reset()}
          >
            <RefreshCcw size={16} /> Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
