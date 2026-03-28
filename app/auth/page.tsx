"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "../../lib/auth";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim()) {
          setError("Username is required");
          setLoading(false);
          return;
        }
        await signUp(email, password, username.trim());
      } else {
        await signIn(email, password);
      }
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "14px",
    border: "1px solid #e5e5e5",
    borderRadius: "8px",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box" as const,
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        {/* Logo */}
        <h1 style={{
          fontSize: "28px",
          fontWeight: 800,
          letterSpacing: "-0.5px",
          margin: "0 0 8px",
          textAlign: "center",
        }}>
          LOG<span style={{ color: "#2d5a3d" }}>OFF</span>
        </h1>
        <p style={{
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
          margin: "0 0 36px",
        }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={inputStyle}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: "red", fontSize: "13px", margin: "10px 0 0", textAlign: "center" }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "20px",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : mode === "login" ? "Log in" : "Sign up"}
        </button>

        {/* Toggle */}
        <p style={{ textAlign: "center", fontSize: "14px", color: "#666", marginTop: "20px" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{
              background: "none",
              border: "none",
              color: "#000",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "14px",
              padding: 0,
            }}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </main>
  );
}
