"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Briefcase, Lock, Save, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

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

export default function AccountSettingsPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobileNo, setMobileNo] = useState("");
  const [designation, setDesignation] = useState("Assistant Manager");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    // Populate with existing data if available
    const storedData = localStorage.getItem("adminSetupData");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.adminProfile) {
          setFirstName(parsed.adminProfile.firstName || "");
          setLastName(parsed.adminProfile.lastName || "");
          setEmail(parsed.adminProfile.email || user?.email || "");
          setDesignation(parsed.adminProfile.designation || "Assistant Manager");
          
          if (parsed.adminProfile.mobileNo) {
            const parts = parsed.adminProfile.mobileNo.split(" ");
            if (parts.length === 2) {
              setCountryCode(parts[0]);
              setMobileNo(parts[1]);
            } else {
              setMobileNo(parsed.adminProfile.mobileNo);
            }
          }
        }
      } catch (e) {
        console.error("Could not parse stored admin data", e);
      }
    } else if (user) {
      if (user.firstName) setFirstName(user.firstName);
      if (user.lastName) setLastName(user.lastName);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, this would be an API call.
    // We update local storage to reflect changes.
    const storedData = localStorage.getItem("adminSetupData");
    let parsed = storedData ? JSON.parse(storedData) : { adminProfile: {} };
    
    parsed.adminProfile = {
      ...parsed.adminProfile,
      firstName,
      lastName,
      email,
      mobileNo: `${countryCode} ${mobileNo}`,
      designation
    };
    
    localStorage.setItem("adminSetupData", JSON.stringify(parsed));
    
    // Also update profile cache
    const profile = { firstName: firstName, email: email };
    localStorage.setItem("ff_user_profile", JSON.stringify(profile));
    
    alert("Profile details saved successfully!");
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters long.");
      return;
    }
    
    // Simulating password change
    localStorage.setItem("ff_password", newPassword);
    alert("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px" }}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>Account Settings</h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
          Update your personal details, designation, and manage account security.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Personal Details Form */}
        <form onSubmit={handleSaveProfile} className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)", display: "flex", alignItems: "center", gap: "8px" }}>
            <User size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Personal Details</h2>
          </div>
          
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  First Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Last Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="email"
                  className="input"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: "36px", width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Mobile Number
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select
                    className="input"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{ width: "120px" }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Phone size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="tel"
                      className="input"
                      placeholder="Mobile No."
                      value={mobileNo}
                      onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, ""))}
                      required
                      style={{ paddingLeft: "36px", width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Designation
                </label>
                <div style={{ position: "relative" }}>
                  <Briefcase size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                  <select
                    className="input"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    style={{ paddingLeft: "36px", width: "100%" }}
                  >
                    {DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button type="submit" className="btn-primary" style={{ padding: "10px 20px" }}>
                <Save size={16} /> Save Profile
              </button>
            </div>
          </div>
        </form>

        {/* Security / Password Form */}
        <form onSubmit={handleSavePassword} className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Lock size={18} color="var(--accent-red)" />
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Security Settings</h2>
          </div>
          
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Current Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{ paddingRight: "44px", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex"
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ paddingRight: "44px", width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(p => !p)}
                    style={{
                      position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex"
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button type="submit" className="btn-primary" style={{ padding: "10px 20px" }}>
                <CheckCircle size={16} /> Update Password
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
