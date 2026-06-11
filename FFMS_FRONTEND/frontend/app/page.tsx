"use client";

import { useRouter } from "next/navigation";
import {
  MapPin,
  CheckCircle,
  TrendingUp,
  UserPlus,
  Download,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: "#fff" }}>

      {/* ═══════════════════════════════════════════
          FULL-BLEED BACKGROUND IMAGE — edge to edge
          ═══════════════════════════════════════════ */}
      <img
        src="/landing-hero.png"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center top", zIndex: 0,
        }}
      />

      {/* Dark gradient overlay — heavier on left for text, fading to transparent on right to reveal image */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(105deg, rgba(7,20,42,0.97) 0%, rgba(7,20,42,0.92) 30%, rgba(7,20,42,0.72) 55%, rgba(7,20,42,0.30) 75%, rgba(7,20,42,0.08) 100%)",
      }} />

      {/* Subtle blue ambient glow — bottom-left */}
      <div style={{
        position: "absolute", bottom: "-15%", left: "-8%", width: "50%", height: "60%",
        borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
        filter: "blur(80px)", zIndex: 1, pointerEvents: "none",
      }} />

      {/* ═══════════════════════════════════════════
          NAVBAR
          ═══════════════════════════════════════════ */}
      <nav style={{
        position: "relative", zIndex: 10,
        maxWidth: 1280, margin: "0 auto", padding: "20px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo — replaceable via public/logo.jpeg */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.jpeg" alt="Eazzio Payroll" style={{ width: 140, height: "auto", objectFit: "contain" }} />
        </div>

        {/* Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {["Features", "Pricing", "Support"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: 14, fontWeight: 600, color: "rgba(203,213,225,0.9)", textDecoration: "none", cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(203,213,225,0.9)")}
            >{item}</a>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(203,213,225,0.9)" }}>Solutions</span>
            <ChevronDown size={14} color="rgba(148,163,184,0.8)" />
          </div>
        </div>

        {/* Auth Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/login")}
            style={{ background: "none", border: "none", color: "rgba(203,213,225,0.9)", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "8px 16px", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(203,213,225,0.9)")}
          >Log In</button>
          <button
            onClick={() => router.push("/register")}
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              padding: "10px 24px", borderRadius: 999, display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(59,130,246,0.3)", transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(59,130,246,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(59,130,246,0.3)"; }}
          >
            <UserPlus size={15} />
            Register
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════
          HERO CONTENT — left-aligned over the overlay
          ═══════════════════════════════════════════ */}
      <main style={{
        position: "relative", zIndex: 10,
        maxWidth: 1280, margin: "0 auto", padding: "40px 48px 48px",
        display: "flex", flexDirection: "column", gap: 22,
      }}>

        {/* Tagline pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10, alignSelf: "flex-start",
          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)",
          borderRadius: 999, padding: "7px 18px",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#93c5fd", letterSpacing: "1.5px", textTransform: "uppercase" }}>✦ Smart • Simple • Connected</span>
        </div>

        {/* Main Headline */}
        <h1 style={{ fontSize: 50, fontWeight: 900, lineHeight: 1.08, letterSpacing: "-1.5px", margin: 0, maxWidth: 560 }}>
          Smart Field Management,
          <span style={{ display: "block", color: "#60a5fa", marginTop: 6 }}>Stronger Teams.</span>
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(203,213,225,0.85)", maxWidth: 520, margin: 0 }}>
          Empower your field workforce, track real-time activities, manage attendance, tasks, routes and locations — all in one intelligent platform.
        </p>

        {/* Feature Icons Grid — 2×2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 40px", maxWidth: 440 }}>
          {[
            { icon: <MapPin size={17} />, label: "Real-time Tracking", color: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.20)" },
            { icon: <CheckCircle size={17} />, label: "Task Management", color: "#10b981", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.20)" },
            { icon: <TrendingUp size={17} />, label: "Live Analytics", color: "#8b5cf6", bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.20)" },
            { icon: <ShieldCheck size={17} />, label: "Secure & Reliable", color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.20)" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: f.bg, border: `1px solid ${f.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: f.color, flexShrink: 0,
              }}>{f.icon}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(226,232,240,0.95)" }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 2 }}>
          <button
            onClick={() => router.push("/register")}
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
              padding: "15px 32px", borderRadius: 14, display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 6px 24px rgba(16,185,129,0.25)", transition: "transform 0.2s, box-shadow 0.2s",
              letterSpacing: "0.5px",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(16,185,129,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(16,185,129,0.25)"; }}
          >
            <UserPlus size={18} strokeWidth={2.5} />
            REGISTER NOW
          </button>
          <button
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(148,163,184,0.25)",
              color: "rgba(226,232,240,0.9)", fontSize: 14, fontWeight: 800, cursor: "pointer",
              padding: "15px 32px", borderRadius: 14, display: "flex", alignItems: "center", gap: 10,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              transition: "transform 0.2s, border-color 0.2s", letterSpacing: "0.5px",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(148,163,184,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(148,163,184,0.25)"; }}
          >
            <Download size={17} strokeWidth={2.5} color="rgba(148,163,184,0.8)" />
            DOWNLOAD BROCHURE
          </button>
        </div>

        {/* Trusted by */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6, paddingTop: 16, borderTop: "1px solid rgba(148,163,184,0.12)" }}>
          <div style={{ display: "flex" }}>
            {[
              { bg: "#10b981", text: "JD" },
              { bg: "#f59e0b", text: "SM" },
              { bg: "#3b82f6", text: "AK" },
              { bg: "#8b5cf6", text: "PL" },
            ].map((a, i) => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: "50%", background: a.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: "#fff",
                border: "2px solid rgba(7,20,42,0.9)", marginLeft: i > 0 ? -8 : 0,
              }}>{a.text}</div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(148,163,184,0.8)" }}>Trusted by organizations to manage field teams more efficiently.</span>
          </div>
        </div>

      </main>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
