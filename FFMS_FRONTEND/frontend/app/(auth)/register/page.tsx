"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { login } from "@/store/slices/authSlice";
import {
  MapPin,
  User,
  Mail,
  Phone,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Globe
} from "lucide-react";

const DESIGNATIONS = [
  "Super Admin",
  "Director",
  "CEO",
  "Operations Manager",
  "Field Operations Lead",
  "Assistant Manager",
  "HR Manager",
  "IT Administrator"
];

const COUNTRY_CODES = [
  { code: "+91", country: "India" },
  { code: "+1", country: "USA/Canada" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "Australia" },
  { code: "+971", country: "UAE" },
  { code: "+65", country: "Singapore" }
];

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [step, setStep] = useState(1); // 1, 2, or 3
  
  // Step 1: Account Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobileNo, setMobileNo] = useState("");
  const [designation, setDesignation] = useState("Assistant Manager");
  
  // Step 2: Choose Plan
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "professional" | "enterprise">("professional");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
  
  // Step 3: Confirmation
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!mobileNo.trim() || mobileNo.length < 8) {
      alert("Please enter a valid mobile number.");
      return;
    }
    setStep(2);
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    const fullName = `${firstName} ${lastName}`.trim();
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
          employeeId: "EMP-" + Date.now(),
          companyName: "FieldForce Org", // Can be extended if you add a company name field
          plan: selectedPlan.toUpperCase()
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || "Failed to register on backend");
      }

      // Save details to LocalStorage to mock database persistent changes
      const setupData = {
        adminProfile: {
          firstName,
          lastName,
          email,
          mobileNo: `${countryCode} ${mobileNo}`,
          designation,
          plan: selectedPlan,
          billingCycle
        },
        setupTimestamp: new Date().toISOString()
      };
      
      localStorage.setItem("adminSetupData", JSON.stringify(setupData));
      localStorage.setItem("ff_password", password);
      localStorage.setItem("adminSetupComplete", "true");

      const tokenVal = resData.data?.accessToken || resData.data?.token;
      if (tokenVal) {
        localStorage.setItem("auth_token", tokenVal);
      }
      
      // Cache profile name
      const profile = { firstName: firstName, email: email };
      localStorage.setItem("ff_user_profile", JSON.stringify(profile));

      // Login using Redux store
      dispatch(login({
        token: tokenVal || "dev_fallback_token",
        user: {
          name: fullName,
          email: email,
          role: "ADMIN"
        }
      }));

      // Trigger router push to dashboard
      setLoading(false);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      {/* Main Container */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px" }}>
        
        {/* Intro Tagline */}
        <div style={{ textAlign: "center", maxWidth: "680px", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginBottom: "10px", letterSpacing: "-0.5px" }}>
            Alright, let's set this up!
          </h2>
          <p style={{ fontSize: "14.5px", color: "#475569", lineHeight: 1.6, margin: 0 }}>
            As a business application, FieldForce requires some information about you to create your admin account. Let's begin now.
          </p>
        </div>

        {/* Stepper Card */}
        <div style={{
          width: "100%",
          maxWidth: "760px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "0", // Tactical sharp edges
          boxShadow: "0 10px 30px rgba(0, 82, 255, 0.03)",
          display: "flex",
          flexDirection: "column"
        }}>
          
          {/* Create Account Header */}
          <div style={{
            background: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Create Account
            </span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", fontFamily: "monospace" }}>
              Step {step} of 3
            </span>
          </div>

          {/* Steps Progress Visualizer */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fafafa" }}>
            {[
              { num: 1, label: "Account Details", active: step >= 1 },
              { num: 2, label: "Choose Plan", active: step >= 2 },
              { num: 3, label: "Confirmation", active: step >= 3 }
            ].map((s) => (
              <div key={s.num} style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 20px",
                borderBottom: step === s.num ? "3px solid #0077ee" : "none",
                background: step === s.num ? "#ffffff" : "transparent",
                opacity: s.active ? 1 : 0.45,
                transition: "all 0.2s ease"
              }}>
                <div style={{
                  width: "24px", height: "24px", borderRadius: "50%",
                  background: step > s.num ? "#10b981" : (step === s.num ? "#0077ee" : "#cbd5e1"),
                  color: "#ffffff", fontSize: "11px", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {step > s.num ? <Check size={12} strokeWidth={3} /> : s.num}
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: step === s.num ? 700 : 500, color: step === s.num ? "#0f172a" : "#64748b" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Form Content Area */}
          <div style={{ padding: "32px" }}>
            
            {/* ─────────────── STEP 1: ACCOUNT DETAILS ─────────────── */}
            {step === 1 && (
              <form onSubmit={handleNextStep1} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Full Name */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                    Full Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      style={{ borderRadius: "0", border: "1px solid #cbd5e1" }}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      style={{ borderRadius: "0", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                    Email ID <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ borderRadius: "0", border: "1px solid #cbd5e1" }}
                  />
                </div>

                {/* Mobile No. */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                    Mobile No. <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <select
                      className="input"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={{ width: "160px", borderRadius: "0", border: "1px solid #cbd5e1", background: "#f8fafc" }}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.country} ({c.code})
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Mobile No."
                      value={mobileNo}
                      onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, ""))}
                      required
                      style={{ flex: 1, borderRadius: "0", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* Designation */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                    Designation <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    className="input"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    style={{ borderRadius: "0", border: "1px solid #cbd5e1", background: "#ffffff" }}
                  >
                    {DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit button at bottom */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                  <button type="submit" className="btn-primary" style={{ padding: "12px 28px", fontSize: "14px", borderRadius: "0", background: "#0077ee" }}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* ─────────────── STEP 2: CHOOSE PLAN ─────────────── */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Billing toggle */}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: billingCycle === "monthly" ? 700 : 500, color: billingCycle === "monthly" ? "#0f172a" : "#64748b" }}>
                    Monthly Billing
                  </span>
                  <button
                    onClick={() => setBillingCycle(p => p === "monthly" ? "annually" : "monthly")}
                    style={{
                      width: "48px", height: "24px", borderRadius: "12px", background: "#0077ee",
                      border: "none", cursor: "pointer", position: "relative", padding: "2px"
                    }}
                  >
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "50%", background: "#ffffff",
                      position: "absolute", top: "2px",
                      left: billingCycle === "monthly" ? "2px" : "26px",
                      transition: "left 0.2s ease"
                    }} />
                  </button>
                  <span style={{ fontSize: "13px", fontWeight: billingCycle === "annually" ? 700 : 500, color: billingCycle === "annually" ? "#0f172a" : "#64748b" }}>
                    Annual Billing <span style={{ color: "#10b981", fontSize: "11px", fontWeight: 700 }}>(Save 20%)</span>
                  </span>
                </div>

                {/* Plan Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                  {[
                    {
                      id: "starter" as const,
                      name: "Starter",
                      priceMonthly: 0,
                      priceAnnual: 0,
                      features: ["Up to 5 Execs", "Basic Live GPS", "Standard Tasks", "Email Support"],
                      color: "#64748b",
                      popular: false
                    },
                    {
                      id: "professional" as const,
                      name: "Professional",
                      priceMonthly: 1999,
                      priceAnnual: 1599,
                      features: ["Up to 50 Execs", "Geofencing Monitor", "Live Map Playback", "Dynamic Forms", "Priority Support"],
                      color: "#0077ee",
                      popular: true
                    },
                    {
                      id: "enterprise" as const,
                      name: "Enterprise",
                      priceMonthly: 4999,
                      priceAnnual: 3999,
                      features: ["Unlimited Execs", "Advanced Audits", "Custom Reports API", "Dedicated Manager", "24/7 Phone SLA"],
                      color: "#7c3aed",
                      popular: false
                    }
                  ].map((p) => {
                    const price = billingCycle === "monthly" ? p.priceMonthly : p.priceAnnual;
                    const isSelected = selectedPlan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        style={{
                          border: isSelected ? `2px solid ${p.color}` : "1px solid #cbd5e1",
                          borderRadius: "0",
                          padding: "24px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                          background: isSelected ? "rgba(0, 119, 238, 0.02)" : "#ffffff",
                          position: "relative",
                          boxShadow: isSelected ? "0 4px 20px rgba(0,0,0,0.04)" : "none",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {p.popular && (
                          <span style={{
                            position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
                            background: p.color, color: "#ffffff", fontSize: "10px", fontWeight: 800,
                            padding: "3px 10px", borderRadius: "12px", textTransform: "uppercase"
                          }}>
                            Popular
                          </span>
                        )}

                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{p.name}</span>
                          <div style={{ marginTop: "8px", display: "flex", alignItems: "baseline", justifyContent: "center", gap: "2px" }}>
                            <span style={{ fontSize: "18px", fontWeight: 700 }}>₹</span>
                            <span style={{ fontSize: "28px", fontWeight: 800 }}>{price.toLocaleString("en-IN")}</span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>/mo</span>
                          </div>
                        </div>

                        <hr style={{ border: "0", borderTop: "1px solid #f1f5f9" }} />

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                          {p.features.map((f, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
                              <CheckCircle2 size={13} color="#10b981" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontSize: "12.5px",
                            fontWeight: 700,
                            border: "none",
                            borderRadius: "0",
                            background: isSelected ? p.color : "#f1f5f9",
                            color: isSelected ? "#ffffff" : "#475569",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {isSelected ? "Selected" : "Select Plan"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Back and Continue Buttons */}
                <div style={{
                  display: "flex", justifyContent: "space-between", marginTop: "12px",
                  borderTop: "1px solid #f1f5f9", paddingTop: "20px"
                }}>
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary" style={{ padding: "12px 28px", fontSize: "14px", borderRadius: "0" }}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="btn-primary" style={{ padding: "12px 28px", fontSize: "14px", borderRadius: "0", background: "#0077ee" }}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────── STEP 3: CONFIRMATION ─────────────── */}
            {step === 3 && (
              <form onSubmit={handleCompleteSetup} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Summary Box */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "20px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#475569", display: "block", marginBottom: "12px", textTransform: "uppercase" }}>
                    Account Summary
                  </span>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "#64748b" }}>Admin Name:</span>
                      <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{firstName} {lastName}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Designation:</span>
                      <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{designation}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Email address:</span>
                      <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{email}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Selected Plan:</span>
                      <div style={{ fontWeight: 700, color: "#0077ee", marginTop: "2px", textTransform: "capitalize" }}>
                        {selectedPlan} Plan ({billingCycle})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password field to complete setup */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                    Choose Your Admin Password <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: "44px", borderRadius: "0", border: "1px solid #cbd5e1" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex"
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)",
                    padding: "10px 14px", color: "#ef4444", fontSize: "12.5px"
                  }}>
                    {error}
                  </div>
                )}

                {/* Action Row */}
                <div style={{
                  display: "flex", justifyContent: "space-between", marginTop: "12px",
                  borderTop: "1px solid #f1f5f9", paddingTop: "20px"
                }}>
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary" style={{ padding: "12px 28px", fontSize: "14px", borderRadius: "0" }}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  {loading ? (
                    <div className="skeleton-box" style={{ width: "240px", height: "46px", borderRadius: "0" }} />
                  ) : (
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{
                        padding: "12px 32px", fontSize: "14.5px", borderRadius: "0",
                        background: "#10b981", borderColor: "#10b981", display: "flex", alignItems: "center", gap: "8px"
                      }}
                    >
                      Complete & Launch Dashboard <Check size={16} />
                    </button>
                  )}
                </div>
              </form>
            )}

          </div>

        </div>

      </main>

      {/* Footer Bottom Bar */}
      <footer style={{
        background: "#f1f5f9", borderTop: "1px solid #e2e8f0",
        padding: "12px 24px", textAlign: "center", fontSize: "11px", color: "#64748b"
      }}>
        Copyright ©  Thesis Eduventures Private Limited. All Rights Reserved.
      </footer>

      {/* Inline styles for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
