import { useState } from "react";
import { signInWithMagicLink } from "../supabase";
import { Palette } from "../types";

// Full-screen sign-in card shown when Supabase is configured but no session.
// Owns its own form state — App only needs to render it.
export default function LoginGate({ C }: { C: Palette }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSending(true);
    const { error: err } = await signInWithMagicLink(trimmed);
    setSending(false);
    if (err) { setError(err.message || "Could not send link. Try again."); return; }
    setSent(true);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", color: C.text, padding: 20 }}>
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "40px 32px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, " + C.accent + ", " + C.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, fontWeight: 900, color: "#000", margin: "0 auto 20px", boxShadow: "0 4px 16px rgba(245,158,11,0.35)" }}>SD</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.headText, fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>System Design Mastery</div>
        <div style={{ fontSize: 14, color: C.dim, marginBottom: 26, letterSpacing: "1.5px", textTransform: "uppercase" }}>{sent ? "Check your email" : "Sign in to sync your progress"}</div>
        {sent ? (
          <>
            <div style={{ background: C.card2, border: "1px solid " + C.green + "40", borderRadius: 10, padding: "14px 16px", fontSize: 15, color: C.text, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
              We sent a one-time sign-in link to <strong style={{ color: C.headText }}>{email}</strong>. Click it to continue.
            </div>
            <button className="btn" onClick={() => { setSent(false); setEmail(""); }} style={{ marginTop: 16, background: "transparent", border: "none", color: C.dim, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline" }}>Use a different email</button>
          </>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="you@example.com"
              autoFocus
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + (error ? C.red : C.border), background: C.inputBg, color: C.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", outline: "none", marginBottom: 10 }}
            />
            {error && <div style={{ color: C.red, fontSize: 14, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>{error}</div>}
            <button className="btn" disabled={sending} onClick={submit} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + C.accent + "40", background: "linear-gradient(135deg, " + C.accent + ", " + C.orange + ")", color: "#000", fontSize: 16, fontWeight: 700, cursor: sending ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'DM Sans', sans-serif", opacity: sending ? 0.7 : 1 }}>
              <span style={{ fontSize: 17 }}>✉️</span>{sending ? "Sending..." : "Send magic link"}
            </button>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 18, lineHeight: 1.6 }}>No password needed. We'll email you a one-time sign-in link.</div>
          </>
        )}
      </div>
    </div>
  );
}
