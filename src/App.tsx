import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { supabase, isSupabaseConfigured, signOut } from "./supabase";
import { UserData, Toast } from "./types";
import { DARK, LIGHT, DC } from "./theme";
import { RESHADED, EST, COMPS, RUBRIC, BB, WEEKS, P, RES, QUOTES, DEEP_DIVES, TRADEOFFS, NFR_DATA, MOCK_PROBLEMS, SCHEMAS, ANTI_PATTERNS, HOW_TO_TALK, GLOSSARY } from "./data";
import { FLOWS, DIFF_FLOW, setDiagramTheme } from "./diagrams";
import LoginGate from "./components/LoginGate";
import ToastBar from "./components/Toast";

const KEY = "sd_v2";

let C = DARK;


export default function App() {
  const [data, setData] = useState<UserData>({ done: {}, notes: {}, weak: {}, sr: {} });
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("roadmap");
  const [loaded, setLoaded] = useState(false);
  const [exp, setExp] = useState(null);
  const [expStep, setExpStep] = useState(null);
  const [editNote, setEditNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [compIdx, setCompIdx] = useState(0);
  const [flowIdx, setFlowIdx] = useState(0);
  // Mock interview timer
  const [mockIdx, setMockIdx] = useState(0);
  const [mockRunning, setMockRunning] = useState(false);
  const [mockTime, setMockTime] = useState(0);
  const [mockScores, setMockScores] = useState<Record<string, number>>({});
  const [mockDone, setMockDone] = useState(false);
  // Search & filter
  const [searchQ, setSearchQ] = useState("");
  const [showWeak, setShowWeak] = useState(false);
  const [startDismissed, setStartDismissed] = useState(false);
  // Estimation calculator
  const [calcDAU, setCalcDAU] = useState("100");
  const [calcActions, setCalcActions] = useState("10");
  const [calcSize, setCalcSize] = useState("1");
  const [calcRetention, setCalcRetention] = useState("5");
  const [calcPeak, setCalcPeak] = useState("3");
  // Auth (Supabase). authReady is true immediately if Supabase isn't configured.
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
  // Toast notifications
  const [toast, setToast] = useState<Toast | null>(null);

  // Theme: reassign the module-level C on every render
  C = theme === "dark" ? DARK : LIGHT;
  setDiagramTheme(theme === "dark");

  // Spaced repetition intervals (days): 1 → 3 → 7 → 14 → 30
  const SR_INTERVALS = [1, 3, 7, 14, 30];
  const sr = data.sr || {};
  const now = Date.now();
  const dayMs = 86400000;
  const srDue = Object.entries(sr).filter(([, v]) => v && v.next <= now);
  const srReview = (id, quality) => {
    const prev = sr[id] || { interval: 0, next: 0 };
    const idx = SR_INTERVALS.indexOf(prev.interval);
    const nextIdx = quality === "good" ? Math.min(idx + 1, SR_INTERVALS.length - 1) : 0;
    const nextInterval = SR_INTERVALS[nextIdx];
    save({ ...data, sr: { ...data.sr, [id]: { interval: nextInterval, next: now + nextInterval * dayMs, lastReview: now } } });
  };
  const srSchedule = () => {
    const first = SR_INTERVALS[0];
    return { interval: first, next: now + first * dayMs, lastReview: now };
  };
  const srRemove = (id) => {
    const newSr = { ...data.sr };
    delete newSr[id];
    return newSr;
  };

  // Subscribe to auth state when Supabase is configured.
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data.session); setAuthReady(true); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Load progress whenever auth is ready or the signed-in user changes.
  useEffect(() => {
    if (!authReady) return;
    let mounted = true;
    setLoaded(false);
    (async () => {
      try {
        if (window && window.storage) {
          const r = await window.storage.get(KEY);
          if (mounted) {
            if (r && r.value) {
              const parsed = JSON.parse(r.value);
              if (parsed && typeof parsed === "object") {
                setData({ done: {}, notes: {}, weak: {}, sr: {}, ...parsed });
                if (parsed.theme) setTheme(parsed.theme);
              }
            } else {
              setData({ done: {}, notes: {}, weak: {}, sr: {} });
            }
          }
        }
      } catch (e) {}
      if (mounted) setLoaded(true);
    })();
    return () => { mounted = false; };
  }, [authReady, session?.user?.id]);

  const showToast = (msg: string, kind?: "ok" | "err") => {
    setToast({ msg, kind: kind || "ok", id: Date.now() });
    setTimeout(() => setToast(t => (t && t.msg === msg ? null : t)), 1800);
  };

  const save = async (nd) => {
    setData(nd);
    try {
      if (window && window.storage) {
        await window.storage.set(KEY, JSON.stringify(nd));
      }
      showToast("✓ Saved");
    } catch (e) {
      showToast("Failed to save", "err");
    }
  };

  // Mock interview timer effect
  useEffect(() => {
    let interval;
    if (mockRunning && mockTime > 0) {
      interval = setInterval(() => setMockTime(t => { if (t <= 1) { setMockRunning(false); return 0; } return t - 1; }), 1000);
    }
    return () => clearInterval(interval);
  }, [mockRunning, mockTime]);

  const tog = (id) => save({ ...data, done: { ...data.done, [id]: !data.done[id] } });
  const togW = (id) => {
    const wasWeak = !!data.weak[id];
    const newWeak = { ...data.weak, [id]: !wasWeak };
    const newSr = wasWeak ? srRemove(id) : { ...data.sr, [id]: srSchedule() };
    save({ ...data, weak: newWeak, sr: newSr });
  };
  const saveN = (k, t) => { save({ ...data, notes: { ...data.notes, [k]: t } }); setEditNote(null); };
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    save({ ...data, theme: next });
  };
  const reset = () => save({ done: {}, notes: {}, weak: {}, sr: {} });

  if (isSupabaseConfigured() && authReady && !session) return <LoginGate C={C} />;

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, " + C.accent + ", " + C.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 900, color: "#000", animation: "pulse 1.5s infinite" }}>SD</div>
      <div style={{ color: C.dim, fontFamily: "'DM Sans', sans-serif", fontSize: 15 }}>Loading...</div>
    </div>
  );

  const done = data.done || {};
  const weak = data.weak || {};
  const notes = data.notes || {};
  const dCnt = Object.values(done).filter(Boolean).length;
  const total = BB.length + P.length;
  const pct = total > 0 ? Math.round((dCnt / total) * 100) : 0;
  const wCnt = Object.values(weak).filter(Boolean).length;

  const Bdg = ({ t, c, bg }: any) => <span style={{ fontSize: 13, padding: "3px 9px", borderRadius: 6, fontWeight: 700, background: bg || (c + "12"), color: c, border: "1px solid " + c + "25", textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'DM Sans', sans-serif" }}>{t}</span>;
  const Chk = ({ c, o }: any) => <div className="check-ani" onClick={o} style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer", border: "2px solid " + (c ? C.green : C.checkBorder), background: c ? "linear-gradient(135deg, " + C.green + ", #059669)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: C.headText, fontWeight: 700, boxShadow: c ? "0 2px 8px rgba(16,185,129,0.3)" : "none" }}>{c ? "✓" : ""}</div>;
  const Str = ({ a, o }: any) => <div className="star-ani" onClick={o} style={{ cursor: "pointer", fontSize: 17, color: a ? C.accent : C.starOff, textShadow: a ? "0 0 8px rgba(245,158,11,0.4)" : "none" }}>★</div>;
  const isDark = theme === "dark";
  const cs: React.CSSProperties = { background: C.card, border: "1px solid " + C.border, borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", color: C.text }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${C.scrollThumb}; border-radius: 10px }
        ::-webkit-scrollbar-thumb:hover { background: ${C.scrollHover} }
        @keyframes fu { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.7 } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 5px rgba(245,158,11,0.1) } 50% { box-shadow: 0 0 20px rgba(245,158,11,0.15) } }
        @keyframes progressGlow { 0%,100% { filter: brightness(1) } 50% { filter: brightness(1.3) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        @keyframes toastIn { 0% { opacity: 0; transform: translate(-50%, 20px) scale(0.9) } 60% { opacity: 1; transform: translate(-50%, -3px) scale(1.02) } 100% { opacity: 1; transform: translate(-50%, 0) scale(1) } }
        @keyframes viewIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .fu { animation: fu 0.4s cubic-bezier(0.22, 1, 0.36, 1) }
        .fade-in { animation: fadeIn 0.3s ease }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) }
        .toast-pop { animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .view-in { animation: viewIn 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        .btn { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1) !important; }
        .btn:hover { filter: brightness(1.25); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.18) }
        .btn:active { transform: translateY(0) scale(0.97) }
        .card { transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
        .card:hover { border-color: ${C.cardHover} !important; transform: translateY(-3px); box-shadow: 0 10px 32px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)'} }
        .row { transition: all 0.15s ease; border-radius: 8px !important; }
        .row:hover { background: ${C.hoverBg} }
        .glow-border { position: relative; }
        .glow-border::after { content: ''; position: absolute; inset: -1px; border-radius: inherit; background: linear-gradient(135deg, rgba(245,158,11,0.1), transparent, rgba(6,182,212,0.1)); z-index: -1; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
        .glow-border:hover::after { opacity: 1; }
        textarea { font-family: 'IBM Plex Mono', monospace; transition: border-color 0.2s; }
        textarea:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 2px ${C.accent}15; }
        a { transition: all 0.2s ease; }
        a:hover { filter: brightness(1.2); }
        .check-ani { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
        .check-ani:hover { transform: scale(1.15); }
        .check-ani:active { transform: scale(0.9); }
        .star-ani { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
        .star-ani:hover { transform: scale(1.3); }
        .nav-tab { position: relative; overflow: hidden; }
        .nav-tab::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(245,158,11,0.08), transparent); opacity: 0; transition: opacity 0.2s; }
        .nav-tab:hover::before { opacity: 1; }
        html { scroll-behavior: smooth; }
        body { line-height: 1.55; -webkit-text-size-adjust: 100%; }
        button, input, textarea, a { -webkit-tap-highlight-color: transparent; }
        *:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; border-radius: 4px; }
        button:focus:not(:focus-visible), input:focus:not(:focus-visible), a:focus:not(:focus-visible) { outline: none; }
        ::placeholder { color: ${C.dim}; opacity: 0.7; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          html { scroll-behavior: auto; }
        }
        @media (max-width: 640px) {
          .card:hover { transform: none; }
          .btn:hover { transform: none; }
        }
      `}</style>

      <div style={{ background: C.headerBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid " + C.headerBorder, padding: "14px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, " + C.accent + ", " + C.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#000", boxShadow: "0 2px 12px rgba(245,158,11,0.3)" }}>SD</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.3px" }}>
                <span style={{ color: C.headText }}>System Design</span>
                <span style={{ color: C.accent, marginLeft: 5 }}>Mastery</span>
              </div>
              <div style={{ fontSize: 12, color: C.dim, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 1 }}>FAANG Interview Prep</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="btn" onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid " + C.border, background: C.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "pointer", padding: 0 }}>{isDark ? "☀️" : "🌙"}</button>
            <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "5px 10px", fontSize: 16, fontWeight: 700, color: C.accent, fontFamily: "'Outfit', sans-serif" }}>{pct}%</div>
            <div style={{ background: C.card2, border: "1px solid " + C.border, borderRadius: 8, padding: "5px 10px", fontSize: 14, fontWeight: 600, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", animation: "pulse 2s infinite" }}></span>
              {dCnt}/{total}
            </div>
            {wCnt > 0 && <div style={{ background: C.card2, border: "1px solid " + C.border, borderRadius: 8, padding: "5px 10px", fontSize: 14, fontWeight: 600, color: C.accent }}>★ {wCnt}</div>}
            {session && <button className="btn" onClick={signOut} title={"Signed in as " + (session.user.email || "user") + " · click to sign out"} style={{ background: C.card2, border: "1px solid " + C.border, borderRadius: 8, padding: "5px 10px", fontSize: 14, fontWeight: 600, color: C.dim, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, maxWidth: 180, fontFamily: "'DM Sans', sans-serif" }}>
              <span style={{ fontSize: 14 }}>👤</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email || "Sign out"}</span>
            </button>}
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin: "10px auto 0", background: C.progressTrack, borderRadius: 6, height: 5, overflow: "hidden" }}>
          <div style={{ width: pct + "%", background: "linear-gradient(90deg, " + C.accent + ", " + C.cyan + ", " + C.accent + ")", backgroundSize: "200% 100%", animation: "shimmer 3s ease infinite", height: "100%", transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)", borderRadius: 6, boxShadow: "0 0 12px rgba(245,158,11,0.3)" }} />
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 24px 50px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.card, borderRadius: 14, padding: 4, border: "1px solid " + C.border, overflowX: "auto", boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
          {[{v:"roadmap",l:"Roadmap",i:"🗺️"},{v:"glossary",l:"Glossary",i:"📖"},{v:"cheat",l:"Cheat",i:"📊"},{v:"method",l:"Method",i:"🎯"},{v:"blocks",l:"Concepts",i:"🧱"},{v:"deep",l:"Deep Dive",i:"🔬"},{v:"tradeoffs",l:"Trade-offs",i:"⚖️"},{v:"nfr",l:"NFR",i:"🛡️"},{v:"problems",l:"Problems",i:"🏗️"},{v:"flows",l:"Flows",i:"🎨"},{v:"schemas",l:"Schemas",i:"🗃️"},{v:"script",l:"Script",i:"🎤"},{v:"calc",l:"Calculator",i:"🧮"},{v:"mock",l:"Mock",i:"⏱️"},{v:"anti",l:"Mistakes",i:"🚫"},{v:"res",l:"Links",i:"📚"}].map(t => (
            <button key={t.v} className="btn nav-tab" onClick={() => setView(t.v)} style={{
              flex: "0 0 auto", padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              background: view === t.v ? "linear-gradient(135deg, " + C.accent + "18, " + C.accent + "08)" : "transparent",
              color: view === t.v ? C.accent : C.dim,
              boxShadow: view === t.v ? "0 0 12px rgba(245,158,11,0.08)" : "none",
              borderBottom: view === t.v ? "2px solid " + C.accent : "2px solid transparent",
            }}>
              <span style={{ marginRight: 4, fontSize: 16 }}>{t.i}</span>{t.l}
            </button>
          ))}
        </div>

        {/* Search bar + Review Weak + Export */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setShowWeak(false); }} placeholder="Search concepts, problems, schemas, glossary..." style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: 10, border: "1px solid " + C.border, background: C.inputBg, color: C.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: 0.4 }}>🔍</span>
            {searchQ && <span onClick={() => setSearchQ("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, cursor: "pointer", color: C.dim, fontWeight: 700 }}>✕</span>}
          </div>
          {wCnt > 0 && <button className="btn" onClick={() => { setShowWeak(!showWeak); setSearchQ(""); }} style={{ padding: "8px 12px", borderRadius: 10, border: showWeak ? "1px solid " + C.accent : "1px solid " + C.border, background: showWeak ? C.accent + "15" : C.card, color: showWeak ? C.accent : C.dim, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans'" }}>★ Review Weak ({wCnt}{srDue.length > 0 ? ` · ${srDue.length} due` : ""})</button>}
          <button className="btn" onClick={() => {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pw = 190; let y = 20;
            const addLine = () => { if (y > 270) { doc.addPage(); y = 20; } };
            // Title
            doc.setFontSize(20); doc.setTextColor(217, 119, 6); doc.text("System Design Mastery", 15, y); y += 8;
            doc.setFontSize(10); doc.setTextColor(100); doc.text("Progress Report — " + new Date().toLocaleDateString(), 15, y); y += 10;
            // Progress bar
            doc.setDrawColor(200); doc.setFillColor(240, 240, 240); doc.roundedRect(15, y, pw, 6, 3, 3, "F");
            doc.setFillColor(217, 119, 6); doc.roundedRect(15, y, Math.max(2, pw * pct / 100), 6, 3, 3, "F");
            doc.setFontSize(9); doc.setTextColor(80); doc.text(pct + "% complete (" + dCnt + "/" + total + ")", 15 + pw / 2, y + 4.5, { align: "center" }); y += 14;
            // Stats
            doc.setFontSize(12); doc.setTextColor(30); doc.text("Summary", 15, y); y += 6;
            doc.setFontSize(9); doc.setTextColor(60);
            const bbD = BB.filter(b => done[b.id]).length; const eD = P.filter(p => p.d === "Easy" && done[p.id]).length;
            const mD = P.filter(p => p.d === "Medium" && done[p.id]).length; const hD = P.filter(p => p.d === "Hard" && done[p.id]).length;
            doc.text("Concepts: " + bbD + "/" + BB.length + "   Easy: " + eD + "/" + P.filter(p => p.d === "Easy").length + "   Medium: " + mD + "/" + P.filter(p => p.d === "Medium").length + "   Hard: " + hD + "/" + P.filter(p => p.d === "Hard").length, 15, y); y += 5;
            doc.text("Starred for review: " + wCnt + " items", 15, y); y += 10;
            // Completed Concepts
            const dBB = BB.filter(b => done[b.id]);
            if (dBB.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(16, 185, 129); doc.text("Completed Concepts (" + dBB.length + ")", 15, y); y += 6; doc.setFontSize(9); doc.setTextColor(60); dBB.forEach(b => { addLine(); doc.text("  " + b.i + " " + b.n + " — " + b.cat, 15, y); y += 4.5; }); y += 6; }
            // Completed Problems
            const dP = P.filter(p => done[p.id]);
            if (dP.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(59, 130, 246); doc.text("Completed Problems (" + dP.length + ")", 15, y); y += 6; doc.setFontSize(9); doc.setTextColor(60); dP.forEach(p => { addLine(); doc.text("  [" + p.d + "] " + p.n, 15, y); y += 4.5; }); y += 6; }
            // Starred items
            const sB = BB.filter(b => weak[b.id]); const sP = P.filter(p => weak[p.id]);
            if (sB.length + sP.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(217, 119, 6); doc.text("Starred / Weak Areas (" + (sB.length + sP.length) + ")", 15, y); y += 6; doc.setFontSize(9); doc.setTextColor(60); sB.forEach(b => { addLine(); doc.text("  [Concept] " + b.n, 15, y); y += 4.5; }); sP.forEach(p => { addLine(); doc.text("  [Problem] " + p.n, 15, y); y += 4.5; }); y += 6; }
            // Spaced Repetition Schedule
            const srItems = Object.entries(sr).filter(([,v]) => v);
            if (srItems.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(139, 92, 246); doc.text("Spaced Repetition Schedule", 15, y); y += 6; doc.setFontSize(9); doc.setTextColor(60); srItems.forEach(([id, v]) => { addLine(); const it = BB.find(b => b.id === id) || P.find(p => p.id === id); const name = it ? it.n : id; const nextDate = new Date(v.next).toLocaleDateString(); doc.text("  " + name + " — next review: " + nextDate + " (interval: " + v.interval + "d)", 15, y); y += 4.5; }); y += 6; }
            // Notes
            const nEntries = Object.entries(notes).filter(([,v]) => v);
            if (nEntries.length > 0) { addLine(); doc.setFontSize(12); doc.setTextColor(6, 182, 212); doc.text("Your Notes", 15, y); y += 6; nEntries.forEach(([k, v]) => { addLine(); doc.setFontSize(9); doc.setTextColor(30); const it = BB.find(b => b.id === k) || P.find(p => p.id === k); doc.text(it ? it.n : k, 15, y); y += 4.5; doc.setTextColor(80); const lines = doc.splitTextToSize(v, pw - 10); lines.forEach(ln => { addLine(); doc.text("  " + ln, 15, y); y += 4; }); y += 4; }); }
            // Footer
            addLine(); doc.setFontSize(8); doc.setTextColor(150); doc.text("Generated by System Design Mastery App — " + new Date().toISOString(), 15, y);
            doc.save("sd-mastery-progress.pdf");
          }} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, color: C.dim, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans'" }}>📄 Export PDF</button>
        </div>

        {/* Review Weak mode with Spaced Repetition */}
        {showWeak && wCnt > 0 && (() => {
          const allWeak: any[] = [...BB.filter(b => weak[b.id]).map(b => ({ ...b, type: "concept" })), ...P.filter(p => weak[p.id]).map(p => ({ ...p, type: "problem" }))];
          const dueItems = allWeak.filter(it => sr[it.id] && sr[it.id].next <= now);
          const upcomingItems = allWeak.filter(it => sr[it.id] && sr[it.id].next > now);
          const unscheduled = allWeak.filter(it => !sr[it.id]);
          return (
          <div className="fu" style={{ marginBottom: 20 }}>
            {/* Due Now section */}
            {dueItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: C.red, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans'" }}>🔴 Due Now ({dueItems.length})</div>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                {dueItems.map(it => (
                  <div key={it.id} className="card" style={{ ...cs, padding: "10px 14px", marginBottom: 6, borderLeft: "3px solid " + C.red }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 17 }}>{it.i}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans'" }}>{it.n}</div>
                        <div style={{ fontSize: 12, color: C.dim }}>{it.type === "concept" ? it.cat + " · Concept" : ""}{it.type === "problem" ? <><Bdg t={it.d} c={DC[it.d].text} bg={DC[it.d].bg} /> Problem</> : ""} · interval: {sr[it.id].interval}d</div>
                      </div>
                      <Chk c={done[it.id]} o={() => tog(it.id)} />
                      <Str a={true} o={() => togW(it.id)} />
                    </div>
                    <div style={{ display: "flex", gap: 6, marginLeft: 24 }}>
                      <button className="btn" onClick={() => srReview(it.id, "good")} style={{ padding: "4px 12px", borderRadius: 7, background: C.green + "15", border: "1px solid " + C.green + "30", color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans'" }}>✓ Good → {SR_INTERVALS[Math.min(SR_INTERVALS.indexOf(sr[it.id].interval) + 1, SR_INTERVALS.length - 1)]}d</button>
                      <button className="btn" onClick={() => srReview(it.id, "again")} style={{ padding: "4px 12px", borderRadius: 7, background: C.red + "15", border: "1px solid " + C.red + "30", color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans'" }}>✗ Again → 1d</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Upcoming reviews */}
            {upcomingItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: C.cyan, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans'" }}>📅 Upcoming ({upcomingItems.length})</div>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                {upcomingItems.sort((a, b) => sr[a.id].next - sr[b.id].next).map(it => {
                  const daysLeft = Math.ceil((sr[it.id].next - now) / dayMs);
                  return (
                  <div key={it.id} className="card" style={{ ...cs, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 17 }}>{it.i}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans'" }}>{it.n}</div>
                      <div style={{ fontSize: 12, color: C.dim }}>{it.type === "concept" ? it.cat : it.d} · review in <span style={{ color: C.cyan, fontWeight: 700 }}>{daysLeft}d</span> · interval: {sr[it.id].interval}d</div>
                    </div>
                    <Str a={true} o={() => togW(it.id)} />
                  </div>
                  );
                })}
              </div>
            )}
            {/* Unscheduled starred items */}
            {unscheduled.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: C.accent, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans'" }}>★ Starred ({unscheduled.length})</div>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                {unscheduled.map(it => (
                  <div key={it.id} className="card" style={{ ...cs, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 17 }}>{it.i}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans'" }}>{it.n}</div>
                      <div style={{ fontSize: 12, color: C.dim }}>{it.type === "concept" ? it.cat + " · Concept" : ""}{it.type === "problem" ? <><Bdg t={it.d} c={DC[it.d].text} bg={DC[it.d].bg} /> Problem</> : ""}</div>
                    </div>
                    <Chk c={done[it.id]} o={() => tog(it.id)} />
                    <Str a={true} o={() => togW(it.id)} />
                  </div>
                ))}
              </div>
            )}
            {dueItems.length === 0 && upcomingItems.length > 0 && (
              <div style={{ textAlign: "center", padding: "12px", borderRadius: 10, background: C.green + "08", border: "1px solid " + C.green + "20" }}>
                <span style={{ fontSize: 14, color: C.green, fontFamily: "'DM Sans'", fontWeight: 600 }}>All caught up! Next review in {Math.ceil((Math.min(...upcomingItems.map(it => sr[it.id].next)) - now) / dayMs)} day(s)</span>
              </div>
            )}
          </div>
          );
        })()}

        {/* ═══ START HERE BANNER ═══ */}
        {view === "roadmap" && !startDismissed && pct < 10 && !showWeak && (
          <div className="fu" style={{ ...cs, marginBottom: 16, padding: "20px 18px", background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.06))", borderColor: C.accent + "25", position: "relative" }}>
            <button onClick={() => setStartDismissed(true)} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 17, fontWeight: 700 }}>✕</button>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.headText, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>🚀 Start Here — Your Learning Path</div>
            <div style={{ fontSize: 14, color: C.dim, fontFamily: "'DM Sans'", marginBottom: 16, lineHeight: 1.5 }}>Follow these 5 phases in order. Each builds on the previous one.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { phase: 1, title: "Foundation", desc: "Learn the vocabulary & interview framework", tabs: ["glossary", "cheat", "method"], color: C.accent, icon: "📖" },
                { phase: 2, title: "Concepts", desc: "Master 20 building blocks + deep dives", tabs: ["blocks", "deep"], color: C.cyan, icon: "🧱" },
                { phase: 3, title: "Decisions", desc: "Learn trade-offs & non-functional requirements", tabs: ["tradeoffs", "nfr"], color: C.purple, icon: "⚖️" },
                { phase: 4, title: "Practice", desc: "Design real systems — problems, flows, schemas", tabs: ["problems", "flows", "schemas"], color: C.blue, icon: "🏗️" },
                { phase: 5, title: "Interview", desc: "Scripts, estimation, mock interviews, mistakes to avoid", tabs: ["script", "calc", "mock", "anti"], color: C.green, icon: "🎤" },
              ].map(p => (
                <div key={p.phase} className="card" onClick={() => { setView(p.tabs[0]); setStartDismissed(true); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.card2, border: "1px solid " + C.border, cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: p.color + "15", border: "1px solid " + p.color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: p.color, fontFamily: "'DM Sans'", letterSpacing: "0.5px" }}>PHASE {p.phase}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans'" }}>{p.title}</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.dim, fontFamily: "'DM Sans'", marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <span style={{ fontSize: 15, color: p.color, opacity: 0.5 }}>→</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: C.dim, fontFamily: "'DM Sans'", fontStyle: "italic", textAlign: "center" }}>Click any phase to jump in, or follow the 8-week Roadmap below ↓</div>
          </div>
        )}

        {view === "roadmap" && !showWeak && (() => {
          const bbDone = BB.filter(b => done[b.id]).length;
          const eDone = P.filter(p => p.d === "Easy" && done[p.id]).length;
          const mDone = P.filter(p => p.d === "Medium" && done[p.id]).length;
          const hDone = P.filter(p => p.d === "Hard" && done[p.id]).length;
          return (
          <div className="fu">
            {/* Stats Dashboard */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Concepts", value: bbDone + "/" + BB.length, icon: "🧱", color: C.cyan, pct: BB.length > 0 ? (bbDone / BB.length * 100) : 0 },
                { label: "Easy", value: eDone + "/" + P.filter(p => p.d === "Easy").length, icon: "🟢", color: C.green, pct: P.filter(p => p.d === "Easy").length > 0 ? (eDone / P.filter(p => p.d === "Easy").length * 100) : 0 },
                { label: "Medium", value: mDone + "/" + P.filter(p => p.d === "Medium").length, icon: "🟡", color: C.accent, pct: P.filter(p => p.d === "Medium").length > 0 ? (mDone / P.filter(p => p.d === "Medium").length * 100) : 0 },
                { label: "Hard", value: hDone + "/" + P.filter(p => p.d === "Hard").length, icon: "🔴", color: C.red, pct: P.filter(p => p.d === "Hard").length > 0 ? (hDone / P.filter(p => p.d === "Hard").length * 100) : 0 },
              ].map((s, i) => (
                <div key={i} className="card" style={{ ...cs, padding: "14px 12px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: Math.max(2, s.pct) + "%", background: "linear-gradient(180deg, " + s.color + "12, " + s.color + "06)", transition: "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }} />
                  <div style={{ fontSize: 21, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: s.color, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 2, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quote of the day */}
            <div style={{ ...cs, padding: "14px 16px", marginBottom: 16, borderColor: C.accent + "15", background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.03))" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accent + "10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>💬</div>
                <div>
                  <div style={{ fontSize: 15, color: C.accent, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontStyle: "italic" }}>"{QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]}"</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>Daily motivation</div>
                </div>
              </div>
            </div>

            {/* Week cards */}
            {WEEKS.map(w => {
              const wD = w.items.filter(id => done[id]).length;
              const wT = w.items.length;
              const isB = w.type === "b";
              const isComplete = wD === wT && wT > 0;
              return (
                <div key={w.w} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden", borderColor: isComplete ? C.green + "30" : C.border }}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: w.c + "12", border: "1px solid " + w.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>{w.e}</div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Bdg t={"Week " + w.w} c={w.c} />
                            {isComplete && <span style={{ fontSize: 13, color: C.green }}>✓ Complete</span>}
                          </div>
                          <div style={{ fontSize: 17, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>{w.t}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 19, fontWeight: 800, color: isComplete ? C.green : w.c, fontFamily: "'Outfit', sans-serif" }}>{wD}/{wT}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.6, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>{w.f}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {w.items.map(id => {
                      const it = isB ? BB.find(b => b.id === id) : P.find(p => p.id === id);
                      if (!it) return null;
                      const dn = !!done[id];
                      const wk = !!weak[id];
                      return (
                        <div key={id} className="row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8 }}>
                          <Chk c={dn} o={() => tog(id)} />
                          <Str a={wk} o={() => togW(id)} />
                          <span onClick={() => { setView(isB ? "blocks" : "problems"); setExp(id); setShowWeak(false); setSearchQ(""); }} style={{ fontSize: 14, color: dn ? C.dim : C.headText, textDecoration: dn ? "line-through" : "none", flex: 1, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>{it.n} <span style={{ fontSize: 11, color: C.accent, opacity: 0.6 }}>→</span></span>
                          {!isB && it.d && DC[it.d] && <Bdg t={it.d} c={DC[it.d].text} bg={DC[it.d].bg} />}
                        </div>
                      );
                    })}
                    </div>
                    <div style={{ marginTop: 10, padding: "8px 10px", background: "linear-gradient(135deg, " + w.c + "08, transparent)", borderRadius: 8, border: "1px solid " + w.c + "12" }}>
                      <span style={{ fontSize: 13, color: w.c, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>💡 {w.tip}</span>
                    </div>
                  </div>
                  <div style={{ background: C.muted, height: 4 }}>
                    <div style={{ width: (wT > 0 ? (wD / wT) * 100 : 0) + "%", background: "linear-gradient(90deg, " + w.c + ", " + w.c + "cc)", height: "100%", transition: "width 0.5s cubic-bezier(0.22, 1, 0.36, 1)", borderRadius: "0 4px 4px 0", boxShadow: wD > 0 ? "0 0 8px " + w.c + "30" : "none" }} />
                  </div>
                </div>
              );
            })}
          </div>
          );
        })()}

        {view === "blocks" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? BB.filter(b => b.n.toLowerCase().includes(sq) || b.cat.toLowerCase().includes(sq) || b.desc.toLowerCase().includes(sq)) : BB;
          return (
          <div className="fu">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🧱 Building Blocks {sq && <span style={{ color: C.accent }}>({filtered.length} results)</span>}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, fontFamily: "'Outfit', sans-serif" }}>{BB.filter(b => done[b.id]).length}/{BB.length}</div>
            </div>
            {filtered.map(b => {
              const dn = !!done[b.id];
              const wk = !!weak[b.id];
              const op = exp === b.id;
              return (
                <div key={b.id} className="card" style={{ ...cs, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    <Chk c={dn} o={() => tog(b.id)} />
                    <Str a={wk} o={() => togW(b.id)} />
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{b.i}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: dn ? C.dim : C.headText, fontFamily: "'DM Sans', sans-serif" }}>{b.n}</div>
                      <div style={{ fontSize: 12, color: C.dim, fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{b.cat} · Depth {b.d}</div>
                    </div>
                    <button className="btn" onClick={() => setExp(op ? null : b.id)} style={{ background: op ? C.accent + "10" : "transparent", border: "1px solid " + (op ? C.accent + "30" : C.border), borderRadius: 7, color: op ? C.accent : C.dim, padding: "5px 8px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>{op ? "▲" : "▼"}</button>
                  </div>
                  {op && (
                    <div style={{ padding: "0 14px 14px" }} className="fu">
                      <div style={{ background: "linear-gradient(135deg, " + C.card2 + ", " + C.bg + ")", borderRadius: 10, padding: "14px 16px", border: "1px solid " + C.border, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: C.purple, fontWeight: 700, marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>📖 What Is It?</div>
                        <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }}>{b.desc}</div>
                      </div>
                      <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px", border: "1px solid " + C.cyan + "12", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>🔑 Key Concepts</div>
                        {b.pts.map((p, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                            <span style={{ color: C.cyan, fontSize: 11, marginTop: 4, flexShrink: 0 }}>●</span>
                            <span style={{ fontSize: 14, color: C.subText, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{p}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div style={{ background: "linear-gradient(135deg, " + C.green + "08, transparent)", borderRadius: 8, padding: "12px 14px", border: "1px solid " + C.green + "15" }}>
                          <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 5, letterSpacing: "0.5px" }}>✅ USE WHEN</div>
                          <div style={{ fontSize: 14, color: C.green, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{b.use}</div>
                        </div>
                        <div style={{ background: "linear-gradient(135deg, " + C.red + "08, transparent)", borderRadius: 8, padding: "12px 14px", border: "1px solid " + C.red + "15" }}>
                          <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 5, letterSpacing: "0.5px" }}>❌ DON'T USE</div>
                          <div style={{ fontSize: 14, color: C.red, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{b.dont}</div>
                        </div>
                      </div>
                      <div style={{ background: "linear-gradient(135deg, " + C.accent + "08, transparent)", borderRadius: 8, padding: "12px 14px", border: "1px solid " + C.accent + "15" }}>
                        <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 5, letterSpacing: "0.5px" }}>🌍 REAL WORLD EXAMPLE</div>
                        <div style={{ fontSize: 14, color: C.accent, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{b.rw}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}

        {view === "problems" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? P.filter(p => p.n.toLowerCase().includes(sq) || p.d.toLowerCase().includes(sq)) : P;
          return (
          <div className="fu">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🏗️ Practice Problems {sq && <span style={{ color: C.accent }}>({filtered.length} results)</span>}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.blue, fontFamily: "'Outfit', sans-serif" }}>{P.filter(p => done[p.id]).length}/{P.length}</div>
            </div>
            {["Easy", "Medium", "Hard"].map(diff => {
              const dProbs = filtered.filter(p => p.d === diff);
              if (sq && dProbs.length === 0) return null;
              return (
              <div key={diff} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", background: DC[diff].bg + "40", borderRadius: 10, border: "1px solid " + DC[diff].text + "15" }}>
                  <Bdg t={diff} c={DC[diff].text} bg={DC[diff].bg} />
                  <div style={{ flex: 1, height: 3, background: C.muted, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: (P.filter(p => p.d === diff).length > 0 ? P.filter(p => p.d === diff && done[p.id]).length / P.filter(p => p.d === diff).length * 100 : 0) + "%", height: "100%", background: DC[diff].text, borderRadius: 2, transition: "width 0.5s" }} />
                  </div>
                  <span style={{ fontSize: 14, color: DC[diff].text, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{P.filter(p => p.d === diff && done[p.id]).length}/{P.filter(p => p.d === diff).length}</span>
                </div>
                {dProbs.map(p => {
                  const dn = !!done[p.id];
                  const wk = !!weak[p.id];
                  const op = exp === p.id;
                  return (
                    <div key={p.id} className="card" style={{ ...cs, marginBottom: 8, overflow: "hidden" }}>
                      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <Chk c={dn} o={() => tog(p.id)} />
                        <Str a={wk} o={() => togW(p.id)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: dn ? C.dim : C.headText, textDecoration: dn ? "line-through" : "none", fontFamily: "'DM Sans', sans-serif" }}>{p.n}</div>
                          <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                            {p.tags.map(t => <span key={t} style={{ fontSize: 12, color: C.dim, background: C.card2, padding: "2px 6px", borderRadius: 4, border: "1px solid " + C.border, fontFamily: "'DM Sans', sans-serif" }}>{t}</span>)}
                          </div>
                        </div>
                        <button className="btn" onClick={() => setExp(op ? null : p.id)} style={{ background: op ? C.accent + "10" : "transparent", border: "1px solid " + (op ? C.accent + "30" : C.border), borderRadius: 7, color: op ? C.accent : C.dim, padding: "5px 8px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>{op ? "▲" : "▼"}</button>
                      </div>
                      {op && (
                        <div style={{ padding: "0 14px 14px" }} className="fu">
                          <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 8 }}>
                            {p.s.map((st, si) => {
                              const sc = RESHADED[Math.min(si, 7)] ? RESHADED[Math.min(si, 7)].c : C.dim;
                              return (
                                <div key={si} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
                                  <div style={{ width: 22, height: 22, borderRadius: 7, background: sc + "12", border: "1px solid " + sc + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: sc, flexShrink: 0 }}>{si + 1}</div>
                                  <div style={{ fontSize: 14, color: C.subText, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{st}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <a href={p.v} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: "7px 14px", borderRadius: 8, background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))", border: "1px solid rgba(239,68,68,0.15)", color: C.red, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>▶ Watch Video</a>
                            <button className="btn" onClick={() => { setEditNote(editNote === p.id ? null : p.id); setNoteText(notes[p.id] || ""); }} style={{ padding: "7px 14px", borderRadius: 8, background: editNote === p.id ? C.accent + "10" : "transparent", border: "1px solid " + (editNote === p.id ? C.accent + "30" : C.border), color: editNote === p.id ? C.accent : C.dim, fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>📝 Notes{notes[p.id] ? " ✓" : ""}</button>
                          </div>
                          {editNote === p.id && (
                            <div style={{ marginTop: 8 }}>
                              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add your notes, key learnings, or gotchas..." style={{ width: "100%", minHeight: 70, padding: "10px 12px", borderRadius: 10, background: C.bg, border: "1px solid " + C.border, color: C.text, fontSize: 14, resize: "vertical", outline: "none", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }} />
                              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <button className="btn" onClick={() => saveN(p.id, noteText)} style={{ padding: "6px 14px", borderRadius: 7, background: "linear-gradient(135deg, " + C.green + "15, " + C.green + "08)", border: "1px solid " + C.green + "25", color: C.green, fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 600 }}>Save Notes</button>
                                <button className="btn" onClick={() => setEditNote(null)} style={{ padding: "6px 14px", borderRadius: 7, background: "transparent", border: "1px solid " + C.border, color: C.dim, fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              );
            })}
          </div>
          );
        })()}

        {view === "flows" && !showWeak && (() => {
          const f = FLOWS[flowIdx];
          const D = f.D;
          return (
            <div className="fu">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🎨 Architecture Flows</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.purple, fontFamily: "'Outfit', sans-serif" }}>{flowIdx + 1}/{FLOWS.length}</div>
              </div>

              {/* Flow chip selector */}
              <div style={{ display: "flex", gap: 5, marginBottom: 14, overflowX: "auto", paddingBottom: 6 }}>
                {FLOWS.map((flow, i) => (
                  <button key={flow.id} className="btn" onClick={() => setFlowIdx(i)} style={{
                    flex: "0 0 auto",
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid " + (flowIdx === i ? DIFF_FLOW[flow.d] + "40" : C.border),
                    background: flowIdx === i ? DIFF_FLOW[flow.d] + "12" : "transparent",
                    color: flowIdx === i ? DIFF_FLOW[flow.d] : C.dim,
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                    cursor: "pointer", whiteSpace: "nowrap",
                    boxShadow: flowIdx === i ? "0 0 8px " + DIFF_FLOW[flow.d] + "15" : "none",
                  }}>
                    <span style={{ marginRight: 4 }}>{flow.i}</span>{flow.n}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div className="card" style={{ ...cs, padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, " + C.card + ", " + DIFF_FLOW[f.d] + "06)" }}>
                <div>
                  <div style={{ fontSize: 23, fontWeight: 800, color: C.headText, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Outfit', sans-serif" }}>
                    <span style={{ fontSize: 27 }}>{f.i}</span>{f.n}
                  </div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 3, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>High-Level Architecture</div>
                </div>
                <Bdg t={f.d} c={DIFF_FLOW[f.d]} />
              </div>

              {/* Diagram */}
              <div className="card" style={{ ...cs, padding: 16, marginBottom: 12, background: C.card }}>
                <D />
              </div>

              {/* Why cards */}
              <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>🧠 Why this design</div>
              {f.w.map((w, i) => (
                <div key={i} className="card" style={{ ...cs, padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, color: C.accent, fontWeight: 700, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{w.q}</div>
                  <div style={{ fontSize: 14, color: C.subText, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{w.a}</div>
                </div>
              ))}

              {/* Prev/Next */}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn" onClick={() => setFlowIdx(i => Math.max(0, i - 1))} disabled={flowIdx === 0} style={{
                  flex: 1, padding: "12px", borderRadius: 10,
                  border: "1px solid " + C.border, background: C.card,
                  color: flowIdx === 0 ? C.dim : C.text,
                  fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                  cursor: flowIdx === 0 ? "not-allowed" : "pointer",
                  opacity: flowIdx === 0 ? 0.4 : 1,
                }}>← Previous</button>
                <button className="btn" onClick={() => setFlowIdx(i => Math.min(FLOWS.length - 1, i + 1))} disabled={flowIdx === FLOWS.length - 1} style={{
                  flex: 2, padding: "12px", borderRadius: 10,
                  border: "1px solid " + C.accent + "30",
                  background: "linear-gradient(135deg, " + C.accent + "15, " + C.accent + "08)", color: C.accent,
                  fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                  cursor: flowIdx === FLOWS.length - 1 ? "not-allowed" : "pointer",
                  opacity: flowIdx === FLOWS.length - 1 ? 0.4 : 1,
                  boxShadow: flowIdx < FLOWS.length - 1 ? "0 2px 12px rgba(245,158,11,0.1)" : "none",
                }}>Next Flow →</button>
              </div>
            </div>
          );
        })()}

        {view === "method" && !showWeak && (
          <div className="fu">
            {/* RESHADED word banner */}
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.04))", borderColor: C.accent + "15" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                {RESHADED.map((s, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: 7, background: s.c + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: s.c }}>{s.l}</div>
                ))}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>The 45-Minute Framework</div>
              <div style={{ fontSize: 13, color: C.dim, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>Follow this structure for every system design interview</div>
            </div>

            {RESHADED.map((s, i) => {
              const op = expStep === i;
              return (
                <div key={i} className="card" style={{ ...cs, marginBottom: 8, overflow: "hidden", cursor: "pointer", borderColor: op ? s.c + "25" : C.border }} onClick={() => setExpStep(op ? null : i)}>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, " + s.c + "18, " + s.c + "08)", border: "1px solid " + s.c + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: s.c, flexShrink: 0 }}>{s.l}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{s.n}</div>
                        <div style={{ fontSize: 12, color: s.c, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{s.t}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? s.c + "12" : "transparent", border: "1px solid " + (op ? s.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? s.c : C.dim, fontSize: 12 }}>{op ? "▲" : "▼"}</div>
                    </div>
                    <div style={{ fontSize: 14, color: C.dim, marginTop: 6, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{s.d}</div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: "1px solid " + s.c + "15" }}>
                        <div style={{ fontSize: 12, color: s.c, fontWeight: 700, marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>Key Questions to Ask:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {s.q.map((q, j) => (
                          <span key={j} style={{ fontSize: 13, color: C.subText, background: s.c + "08", border: "1px solid " + s.c + "15", padding: "4px 8px", borderRadius: 6, fontFamily: "'DM Sans', sans-serif" }}>{q}</span>
                        ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: C.red, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>📋 Grading Rubric</div>
            </div>
            {RUBRIC.map((r, i) => (
              <div key={i} className="card" style={{ ...cs, padding: "12px 16px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{r.a}</span>
                  <Bdg t={r.w} c={C.accent} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "linear-gradient(135deg, " + C.green + "06, transparent)", padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.green + "12" }}>
                    <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 3, letterSpacing: "0.5px" }}>✅ GOOD</div>
                    <div style={{ fontSize: 13, color: C.green, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{r.g}</div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, " + C.red + "06, transparent)", padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.red + "12" }}>
                    <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 3, letterSpacing: "0.5px" }}>❌ BAD</div>
                    <div style={{ fontSize: 13, color: C.red, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{r.b}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ HOW TO TALK / SCRIPT VIEW ═══ */}
        {view === "script" && !showWeak && (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.04))", borderColor: C.accent + "15" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🎤 How to Talk in a System Design Interview</div>
              <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Word-for-word scripts for each phase — practice saying these out loud</div>
            </div>
            {HOW_TO_TALK.map((ht, hi) => {
              const op = exp === ht.id;
              return (
                <div key={ht.id} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden", borderLeft: "3px solid " + ht.c }}>
                  <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExp(op ? null : ht.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: ht.c + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: ht.c, fontWeight: 800, fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>{hi + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{ht.phase}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? ht.c + "12" : "transparent", border: "1px solid " + (op ? ht.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? ht.c : C.dim, fontSize: 12 }}>{op ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      <div style={{ background: "linear-gradient(135deg, " + ht.c + "06, " + C.bg + ")", borderRadius: 10, padding: "14px 16px", border: "1px solid " + ht.c + "15", marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: ht.c, fontWeight: 700, marginBottom: 6, letterSpacing: "1px", textTransform: "uppercase" }}>💬 Say This</div>
                        <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>{ht.script}</div>
                      </div>
                      <div style={{ background: C.bg, borderRadius: 8, padding: "12px 14px", border: "1px solid " + C.green + "10" }}>
                        <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>💡 Pro Tips</div>
                        {ht.tips.map((tip, ti) => (
                          <div key={ti} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
                            <span style={{ color: C.green, fontSize: 11, marginTop: 4, flexShrink: 0 }}>●</span>
                            <span style={{ fontSize: 14, color: C.green, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ GLOSSARY VIEW ═══ */}
        {view === "glossary" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? GLOSSARY.filter(g => g.term.toLowerCase().includes(sq) || g.def.toLowerCase().includes(sq)) : GLOSSARY;
          return (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(6,182,212,0.04))", borderColor: C.cyan + "15" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>📖 System Design Glossary</div>
              <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>{GLOSSARY.length} terms — everything you need to speak fluently in interviews</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 8 }}>
            {filtered.map((g, gi) => (
              <div key={gi} className="card" style={{ ...cs, padding: "12px 14px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.cyan, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{g.term}</div>
                <div style={{ fontSize: 14, color: C.subText, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{g.def}</div>
              </div>
            ))}
            </div>
          </div>
          );
        })()}

        {view === "cheat" && !showWeak && (
          <div className="fu">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[{ t: "🔢 Numbers", k: "nums", c: C.accent }, { t: "📏 Storage Sizes", k: "storage", c: C.cyan }, { t: "⏱️ Latency", k: "latency", c: C.green }, { t: "🚀 Throughput", k: "throughput", c: C.blue }, { t: "🌐 Network / Disk", k: "network", c: C.orange }].map(sec => (
              <div key={sec.k} className="card" style={{ ...cs, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, color: sec.c, fontWeight: 700, marginBottom: 8, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}>{sec.t}</div>
                {EST[sec.k].map((n, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < EST[sec.k].length - 1 ? "1px solid " + C.border : "none", gap: 6 }}>
                    <span style={{ fontSize: 12, color: C.dim, fontFamily: "'DM Sans', sans-serif" }}>{n.l}</span>
                    <span style={{ fontSize: 12, color: sec.c, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{n.v}</span>
                  </div>
                ))}
              </div>
            ))}
            </div>

            <div className="card" style={{ ...cs, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: C.purple, fontWeight: 700, marginBottom: 10, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}>🧮 Estimation Formulas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6 }}>
              {EST.formulas.map((f, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 6, padding: "8px 10px", border: "1px solid " + C.purple + "10" }}>
                  <div style={{ fontSize: 12, color: C.dim, fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>{f.l}</div>
                  <div style={{ fontSize: 13, color: C.purple, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{f.f}</div>
                </div>
              ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>⚔️ Comparisons</div>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
              {COMPS.map((c, i) => (
                <button key={i} className="btn" onClick={() => setCompIdx(i)} style={{ flex: "0 0 auto", padding: "6px 12px", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: "nowrap", background: compIdx === i ? c.c + "12" : "transparent", border: "1px solid " + (compIdx === i ? c.c + "30" : C.border), color: compIdx === i ? c.c : C.dim, cursor: "pointer", boxShadow: compIdx === i ? "0 0 8px " + c.c + "10" : "none" }}>{c.t}</button>
              ))}
            </div>
            {COMPS[compIdx] && (
              <div className="card" style={{ ...cs, padding: "14px 16px" }}>
                <div style={{ fontSize: 16, color: COMPS[compIdx].c, fontWeight: 700, marginBottom: 10, fontFamily: "'Outfit', sans-serif" }}>{COMPS[compIdx].t}</div>
                {COMPS[compIdx].rows.map((r, ri) => {
                  const has3 = !!r.c;
                  return (
                  <div key={ri} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: ri < COMPS[compIdx].rows.length - 1 ? "1px solid " + C.border : "none" }}>
                    <div style={{ fontSize: 13, color: C.dim, fontWeight: 700, marginBottom: 5, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" }}>{r.k}</div>
                    <div style={{ display: "grid", gridTemplateColumns: has3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 6 }}>
                      <div style={{ fontSize: 13, color: C.blue, lineHeight: 1.5, background: C.blue + "08", padding: "6px 10px", borderRadius: 6, border: "1px solid " + C.blue + "12", fontFamily: "'DM Sans', sans-serif" }}>{r.a}</div>
                      <div style={{ fontSize: 13, color: C.orange, lineHeight: 1.5, background: C.orange + "08", padding: "6px 10px", borderRadius: 6, border: "1px solid " + C.orange + "12", fontFamily: "'DM Sans', sans-serif" }}>{r.b}</div>
                      {has3 && <div style={{ fontSize: 13, color: C.purple, lineHeight: 1.5, background: C.purple + "08", padding: "6px 10px", borderRadius: 6, border: "1px solid " + C.purple + "12", fontFamily: "'DM Sans', sans-serif" }}>{r.c}</div>}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ DEEP DIVES VIEW ═══ */}
        {view === "deep" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? DEEP_DIVES.filter(d => d.n.toLowerCase().includes(sq) || d.cat.toLowerCase().includes(sq) || d.summary.toLowerCase().includes(sq)) : DEEP_DIVES;
          return (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(139,92,246,0.04))", borderColor: C.purple + "15" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🔬 Deep Dives</div>
              <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Core distributed systems concepts every senior engineer must know</div>
            </div>
            {filtered.map(dd => {
              const op = exp === dd.id;
              return (
                <div key={dd.id} className="card" style={{ ...cs, marginBottom: 8, overflow: "hidden", cursor: "pointer", borderColor: op ? dd.c + "25" : C.border }} onClick={() => setExp(op ? null : dd.id)}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, " + dd.c + "18, " + dd.c + "08)", border: "1px solid " + dd.c + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>{dd.i}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{dd.n}</div>
                        <div style={{ fontSize: 12, color: dd.c, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{dd.cat}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? dd.c + "12" : "transparent", border: "1px solid " + (op ? dd.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? dd.c : C.dim, fontSize: 12 }}>{op ? "▲" : "▼"}</div>
                    </div>
                    <div style={{ fontSize: 14, color: C.dim, marginTop: 6, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{dd.summary}</div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu" onClick={e => e.stopPropagation()}>
                      {dd.sections.map((sec, si) => (
                        <div key={si} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: "1px solid " + dd.c + "12", marginBottom: 6 }}>
                          <div style={{ fontSize: 13, color: dd.c, fontWeight: 700, marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>{sec.t}</div>
                          <div style={{ fontSize: 14, color: C.subText, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>{sec.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}

        {/* ═══ TRADE-OFFS VIEW ═══ */}
        {view === "tradeoffs" && !showWeak && (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(59,130,246,0.04))", borderColor: C.blue + "15" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>⚖️ Trade-off Decision Trees</div>
              <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Use these flowcharts to pick the right tool. Interviewers love structured reasoning.</div>
            </div>
            {TRADEOFFS.map(to => {
              const op = exp === to.id;
              return (
                <div key={to.id} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExp(op ? null : to.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: to.c + "12", border: "1px solid " + to.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>{to.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{to.n}</div>
                        <div style={{ fontSize: 13, color: to.c, fontFamily: "'DM Sans', sans-serif" }}>❓ {to.question}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? to.c + "12" : "transparent", border: "1px solid " + (op ? to.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? to.c : C.dim, fontSize: 12 }}>{op ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      {to.branches.map((br, bi) => (
                        <div key={bi} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: "1px solid " + br.color + "15", marginBottom: 6, borderLeft: "3px solid " + br.color }}>
                          <div style={{ fontSize: 13, color: C.dim, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>IF: <span style={{ color: C.text }}>{br.condition}</span></div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: br.color, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>→ {br.answer}</div>
                          <div style={{ fontSize: 13, color: C.dim, fontFamily: "'DM Sans', sans-serif" }}>📌 {br.examples}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ NFR VIEW ═══ */}
        {view === "nfr" && !showWeak && (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(6,182,212,0.04))", borderColor: C.cyan + "15" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🛡️ Non-Functional Requirements</div>
              <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>The things that separate senior engineers from juniors in interviews</div>
            </div>
            {NFR_DATA.map(nfr => {
              const op = exp === nfr.id;
              return (
                <div key={nfr.id} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExp(op ? null : nfr.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: nfr.c + "12", border: "1px solid " + nfr.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>{nfr.i}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{nfr.n}</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? nfr.c + "12" : "transparent", border: "1px solid " + (op ? nfr.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? nfr.c : C.dim, fontSize: 12 }}>{op ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      {nfr.sections.map((sec, si) => (
                        <div key={si} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: "1px solid " + nfr.c + "10", marginBottom: 6 }}>
                          <div style={{ fontSize: 13, color: nfr.c, fontWeight: 700, marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>{sec.t}</div>
                          {sec.items.map((item, ii) => (
                            <div key={ii} style={{ display: "flex", gap: 8, marginBottom: 3, alignItems: "flex-start" }}>
                              <span style={{ color: nfr.c, fontSize: 11, marginTop: 3 }}>●</span>
                              <span style={{ fontSize: 14, color: C.subText, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ MOCK INTERVIEW TIMER ═══ */}
        {view === "mock" && !showWeak && (() => {
          const mp = MOCK_PROBLEMS[mockIdx];
          const mins = Math.floor(mockTime / 60);
          const secs = mockTime % 60;
          const totalSec = mp.time * 60;
          const pctLeft = totalSec > 0 ? (mockTime / totalSec) * 100 : 0;
          const timerColor = pctLeft > 50 ? C.green : pctLeft > 20 ? C.accent : C.red;
          const avgScore = Object.keys(mockScores).length > 0 ? (Object.values(mockScores).reduce((a, b) => a + b, 0) / Object.keys(mockScores).length).toFixed(1) : null;
          return (
            <div className="fu">
              <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(245,158,11,0.04))", borderColor: C.accent + "15" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>⏱️ Mock Interview Practice</div>
                <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Pick a problem, start the timer, and grade yourself honestly</div>
              </div>

              {/* Problem selector */}
              <div style={{ display: "flex", gap: 5, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
                {MOCK_PROBLEMS.map((p, i) => (
                  <button key={p.id} className="btn" onClick={() => { setMockIdx(i); setMockRunning(false); setMockTime(0); setMockScores({}); setMockDone(false); }} style={{
                    flex: "0 0 auto", padding: "6px 12px", borderRadius: 8, fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
                    background: mockIdx === i ? (DC[p.d]?.bg || C.card2) : "transparent",
                    border: "1px solid " + (mockIdx === i ? (DC[p.d]?.text || C.accent) + "40" : C.border),
                    color: mockIdx === i ? (DC[p.d]?.text || C.accent) : C.dim,
                  }}>{p.n}</button>
                ))}
              </div>

              {/* Timer display */}
              <div className="card" style={{ ...cs, padding: "24px 20px", marginBottom: 14, textAlign: "center", background: "linear-gradient(135deg, " + C.card + ", " + timerColor + "04)" }}>
                <Bdg t={mp.d} c={DC[mp.d]?.text || C.accent} bg={DC[mp.d]?.bg} />
                <div style={{ fontSize: 25, fontWeight: 800, color: C.headText, fontFamily: "'Outfit', sans-serif", marginTop: 10 }}>{mp.n}</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: timerColor, fontFamily: "'Outfit', sans-serif", marginTop: 12, fontVariantNumeric: "tabular-nums" }}>
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </div>
                <div style={{ maxWidth: 300, margin: "12px auto 0", background: C.muted, borderRadius: 6, height: 6, overflow: "hidden" }}>
                  <div style={{ width: pctLeft + "%", background: timerColor, height: "100%", transition: "width 1s linear", borderRadius: 6 }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                  {!mockRunning && mockTime === 0 && !mockDone && (
                    <button className="btn" onClick={() => { setMockTime(mp.time * 60); setMockRunning(true); setMockScores({}); setMockDone(false); }} style={{ padding: "10px 28px", borderRadius: 10, background: "linear-gradient(135deg, " + C.green + "20, " + C.green + "10)", border: "1px solid " + C.green + "30", color: C.green, fontSize: 16, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, cursor: "pointer" }}>▶ Start ({mp.time} min)</button>
                  )}
                  {mockRunning && (
                    <>
                      <button className="btn" onClick={() => setMockRunning(false)} style={{ padding: "10px 20px", borderRadius: 10, background: C.accent + "12", border: "1px solid " + C.accent + "30", color: C.accent, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>⏸ Pause</button>
                      <button className="btn" onClick={() => { setMockRunning(false); setMockDone(true); }} style={{ padding: "10px 20px", borderRadius: 10, background: C.red + "12", border: "1px solid " + C.red + "30", color: C.red, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>⏹ Finish</button>
                    </>
                  )}
                  {!mockRunning && mockTime > 0 && !mockDone && (
                    <>
                      <button className="btn" onClick={() => setMockRunning(true)} style={{ padding: "10px 20px", borderRadius: 10, background: C.green + "12", border: "1px solid " + C.green + "30", color: C.green, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>▶ Resume</button>
                      <button className="btn" onClick={() => { setMockRunning(false); setMockDone(true); }} style={{ padding: "10px 20px", borderRadius: 10, background: C.blue + "12", border: "1px solid " + C.blue + "30", color: C.blue, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>✓ Done, Grade Me</button>
                    </>
                  )}
                  {(mockDone || (mockTime === 0 && Object.keys(mockScores).length > 0)) && (
                    <button className="btn" onClick={() => { setMockTime(0); setMockScores({}); setMockDone(false); }} style={{ padding: "10px 20px", borderRadius: 10, background: C.purple + "12", border: "1px solid " + C.purple + "30", color: C.purple, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>🔄 Reset</button>
                  )}
                </div>
              </div>

              {/* Self-assessment rubric */}
              {(mockDone || (mockTime === 0 && mockRunning === false && Object.keys(mockScores).length > 0)) && (
                <div className="fu">
                  <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>📝 Self-Assessment</div>
                  {mp.rubric.map((r, ri) => (
                    <div key={ri} className="card" style={{ ...cs, padding: "12px 16px", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{r}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: (mockScores[ri] || 0) >= 4 ? C.green : (mockScores[ri] || 0) >= 2 ? C.accent : C.dim, fontFamily: "'Outfit', sans-serif" }}>{mockScores[ri] || "–"}/5</span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} className="btn" onClick={() => setMockScores({ ...mockScores, [ri]: s })} style={{
                            flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            background: (mockScores[ri] || 0) >= s ? (s >= 4 ? C.green : s >= 2 ? C.accent : C.red) + "15" : "transparent",
                            border: "1px solid " + ((mockScores[ri] || 0) >= s ? (s >= 4 ? C.green : s >= 2 ? C.accent : C.red) + "30" : C.border),
                            color: (mockScores[ri] || 0) >= s ? (s >= 4 ? C.green : s >= 2 ? C.accent : C.red) : C.dim,
                          }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {avgScore && (
                    <div style={{ ...cs, padding: "16px", marginTop: 10, textAlign: "center", background: "linear-gradient(135deg, " + C.card + ", " + (parseFloat(avgScore) >= 4 ? C.green : parseFloat(avgScore) >= 2.5 ? C.accent : C.red) + "06)" }}>
                      <div style={{ fontSize: 13, color: C.dim, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Overall Score</div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: parseFloat(avgScore) >= 4 ? C.green : parseFloat(avgScore) >= 2.5 ? C.accent : C.red, fontFamily: "'Outfit', sans-serif", marginTop: 4 }}>{avgScore}/5</div>
                      <div style={{ fontSize: 14, color: C.dim, fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                        {parseFloat(avgScore) >= 4.5 ? "🎉 Strong hire!" : parseFloat(avgScore) >= 3.5 ? "👍 Hire — minor areas to improve" : parseFloat(avgScore) >= 2.5 ? "⚠️ Borderline — practice weak areas" : "📚 Keep studying — review the method tab"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rubric reference */}
              {!mockDone && mockTime === 0 && Object.keys(mockScores).length === 0 && (
                <div style={{ ...cs, padding: "14px 16px", marginTop: 8 }}>
                  <div style={{ fontSize: 13, color: C.dim, fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>Grading Criteria</div>
                  {mp.rubric.map((r, ri) => (
                    <div key={ri} style={{ display: "flex", gap: 6, marginBottom: 3, alignItems: "center" }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: C.accent + "10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.accent, fontWeight: 700, flexShrink: 0 }}>{ri + 1}</span>
                      <span style={{ fontSize: 14, color: C.subText, fontFamily: "'DM Sans', sans-serif" }}>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ ESTIMATION CALCULATOR ═══ */}
        {view === "calc" && !showWeak && (() => {
          const dau = parseFloat(calcDAU) * 1e6 || 0;
          const actions = parseFloat(calcActions) || 0;
          const sizeKB = parseFloat(calcSize) || 0;
          const retYrs = parseFloat(calcRetention) || 0;
          const peak = parseFloat(calcPeak) || 1;
          const qps = dau > 0 ? Math.round(dau * actions / 86400) : 0;
          const peakQps = Math.round(qps * peak);
          const storageDay = dau * actions * sizeKB / 1e6; // GB/day
          const storageYear = storageDay * 365;
          const storageTotal = storageYear * retYrs;
          const bwMBps = (qps * sizeKB) / 1000;
          const cacheGB = storageDay * 0.2;
          const fmt = (n) => {
            if (n >= 1e12) return (n / 1e12).toFixed(1) + " TB";
            if (n >= 1e9) return (n / 1e9).toFixed(1) + " PB";
            if (n >= 1e6) return (n / 1e6).toFixed(1) + " PB";
            if (n >= 1e3) return (n / 1e3).toFixed(1) + " TB";
            return n.toFixed(1) + " GB";
          };
          const fmtQps = (n) => {
            if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
            if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
            return n.toString();
          };
          const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, background: C.bg, border: "1px solid " + C.border, color: C.accent, fontSize: 17, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", outline: "none", textAlign: "right" };
          return (
            <div className="fu">
              <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(6,182,212,0.04))", borderColor: C.cyan + "15" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🧮 Back-of-Envelope Calculator</div>
                <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Plug in numbers and get instant estimates for your system design</div>
              </div>

              {/* Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "DAU (millions)", value: calcDAU, set: setCalcDAU, icon: "👥" },
                  { label: "Actions/user/day", value: calcActions, set: setCalcActions, icon: "🔄" },
                  { label: "Avg record size (KB)", value: calcSize, set: setCalcSize, icon: "📦" },
                  { label: "Retention (years)", value: calcRetention, set: setCalcRetention, icon: "📅" },
                  { label: "Peak multiplier (x)", value: calcPeak, set: setCalcPeak, icon: "📈" },
                ].map((inp, i) => (
                  <div key={i} style={{ ...cs, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, color: C.dim, marginBottom: 6, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" }}>{inp.icon} {inp.label}</div>
                    <input type="number" value={inp.value} onChange={e => inp.set(e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>

              {/* Results */}
              <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>📊 Estimated Results</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Avg QPS", value: fmtQps(qps), color: C.blue, detail: dau > 0 ? (dau / 1e6).toFixed(0) + "M × " + actions + " / 86,400" : "—" },
                  { label: "Peak QPS", value: fmtQps(peakQps), color: C.red, detail: fmtQps(qps) + " × " + peak },
                  { label: "Bandwidth", value: bwMBps.toFixed(1) + " MB/s", color: C.purple, detail: fmtQps(qps) + " × " + sizeKB + "KB" },
                ].map((r, i) => (
                  <div key={i} className="card" style={{ ...cs, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: C.dim, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 21, fontWeight: 800, color: r.color, fontFamily: "'Outfit', sans-serif" }}>{r.value}</div>
                    <div style={{ fontSize: 11, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>{r.detail}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Storage/day", value: storageDay >= 1000 ? (storageDay / 1000).toFixed(1) + " TB" : storageDay.toFixed(1) + " GB", color: C.green },
                  { label: "Storage/year", value: fmt(storageYear), color: C.accent },
                  { label: "Total (" + retYrs + "yr)", value: fmt(storageTotal), color: C.orange },
                ].map((r, i) => (
                  <div key={i} className="card" style={{ ...cs, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: C.dim, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 21, fontWeight: 800, color: r.color, fontFamily: "'Outfit', sans-serif" }}>{r.value}</div>
                  </div>
                ))}
              </div>

              {/* Cache estimate */}
              <div className="card" style={{ ...cs, padding: "14px 16px", marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, color: C.red, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>⚡ Cache Estimate (20% rule)</div>
                    <div style={{ fontSize: 13, color: C.dim, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>Cache ~20% of daily data for hot reads</div>
                  </div>
                  <div style={{ fontSize: 23, fontWeight: 800, color: C.red, fontFamily: "'Outfit', sans-serif" }}>{cacheGB >= 1000 ? (cacheGB / 1000).toFixed(1) + " TB" : cacheGB.toFixed(1) + " GB"}</div>
                </div>
              </div>

              {/* Quick presets */}
              <div style={{ fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: "2px", marginTop: 16, marginBottom: 8, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>⚡ Quick Presets</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { n: "Twitter", dau: "200", act: "5", size: "1", ret: "5", pk: "3" },
                  { n: "Instagram", dau: "500", act: "3", size: "500", ret: "10", pk: "2" },
                  { n: "WhatsApp", dau: "1000", act: "50", size: "0.5", ret: "5", pk: "3" },
                  { n: "YouTube", dau: "1000", act: "5", size: "50000", ret: "10", pk: "2" },
                  { n: "URL Shortener", dau: "100", act: "1", size: "0.5", ret: "5", pk: "10" },
                ].map((p, i) => (
                  <button key={i} className="btn" onClick={() => { setCalcDAU(p.dau); setCalcActions(p.act); setCalcSize(p.size); setCalcRetention(p.ret); setCalcPeak(p.pk); }} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600, cursor: "pointer", background: C.card2, border: "1px solid " + C.border, color: C.text,
                  }}>{p.n}</button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ═══ SCHEMA DESIGNS VIEW ═══ */}
        {view === "schemas" && !showWeak && (() => {
          const sq = searchQ.toLowerCase();
          const filtered = sq ? SCHEMAS.filter(s => s.n.toLowerCase().includes(sq) || s.tables.some(t => t.name.toLowerCase().includes(sq))) : SCHEMAS;
          return (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(139,92,246,0.04))", borderColor: C.purple + "15" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🗃️ Schema Design Examples</div>
              <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Concrete table designs for top interview problems — ready to draw on whiteboard</div>
            </div>
            {filtered.map(sc => {
              const op = exp === sc.id;
              return (
                <div key={sc.id} className="card" style={{ ...cs, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExp(op ? null : sc.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: sc.c + "12", border: "1px solid " + sc.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>{sc.i}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{sc.n}</div>
                        <div style={{ fontSize: 12, color: sc.c, fontFamily: "'DM Sans', sans-serif" }}>{sc.tables.length} tables/stores</div>
                      </div>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: op ? sc.c + "12" : "transparent", border: "1px solid " + (op ? sc.c + "30" : C.border), display: "flex", alignItems: "center", justifyContent: "center", color: op ? sc.c : C.dim, fontSize: 12 }}>{op ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {op && (
                    <div style={{ padding: "0 16px 14px" }} className="fu">
                      {sc.tables.map((tbl, ti) => (
                        <div key={ti} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", border: "1px solid " + sc.c + "10", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: "#000", background: sc.c, padding: "1px 6px", borderRadius: 4, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{tbl.name}</span>
                          </div>
                          <div style={{ fontSize: 13, color: C.cyan, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.7, background: C.card2, borderRadius: 6, padding: "8px 10px", marginBottom: 6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{tbl.cols}</div>
                          <div style={{ fontSize: 13, color: C.dim, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, fontStyle: "italic" }}>💡 {tbl.note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}

        {/* ═══ INTERVIEW ANTI-PATTERNS VIEW ═══ */}
        {view === "anti" && !showWeak && (
          <div className="fu">
            <div style={{ ...cs, padding: "16px 18px", marginBottom: 16, background: "linear-gradient(135deg, " + C.card + ", rgba(239,68,68,0.04))", borderColor: C.red + "15" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.headText, fontFamily: "'Outfit', sans-serif" }}>🚫 Common Interview Mistakes</div>
              <div style={{ fontSize: 14, color: C.dim, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Avoid these and you're already ahead of 80% of candidates</div>
            </div>
            {ANTI_PATTERNS.map((ap, ai) => {
              const sevColor = ap.severity === "critical" ? C.red : ap.severity === "high" ? C.orange : C.accent;
              return (
                <div key={ap.id} className="card" style={{ ...cs, marginBottom: 8, borderLeft: "3px solid " + sevColor, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: sevColor + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: sevColor, fontWeight: 800, fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>{ai + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: C.headText, fontFamily: "'DM Sans', sans-serif" }}>{ap.mistake}</span>
                        <span style={{ fontSize: 11, color: sevColor, background: sevColor + "12", padding: "1px 6px", borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>{ap.severity}</span>
                      </div>
                      <div style={{ fontSize: 14, color: C.green, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", background: C.green + "06", padding: "8px 10px", borderRadius: 6, border: "1px solid " + C.green + "10", marginTop: 4 }}>
                        ✅ <span style={{ color: C.green }}>{ap.fix}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "res" && !showWeak && (
          <div className="fu">
            <div className="card" style={{ ...cs, padding: "14px 16px", marginBottom: 16, borderColor: C.green + "15", background: "linear-gradient(135deg, " + C.card + ", rgba(16,185,129,0.03))" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green + "10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>🚀</div>
                <div>
                  <div style={{ fontSize: 15, color: C.green, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Recommended Path</div>
                  <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Alex Xu Vol 1 + ByteByteGo → Grokking → Mock Interviews</div>
                </div>
              </div>
            </div>
            {RES.map((cat, ci) => (
              <div key={ci} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, color: C.accent, fontWeight: 700, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>{cat.cat}</div>
                {cat.items.map((it, ii) => (
                  <div key={ii} className="card" style={{ ...cs, marginBottom: 8, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <a href={it.u} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, fontWeight: 600, color: C.headText, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 4 }}>{it.n} <span style={{ fontSize: 13, opacity: 0.5 }}>↗</span></a>
                        <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.6, marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>{it.d}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 13, color: it.p === "Free" ? C.green : C.accent, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: it.p === "Free" ? C.green + "10" : C.accent + "10", fontFamily: "'DM Sans', sans-serif" }}>{it.p}</div>
                        <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{it.r}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ ...cs, padding: "14px", marginTop: 20, borderColor: C.red + "10" }}>
              <button className="btn" onClick={reset} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))", border: "1px solid rgba(239,68,68,0.12)", color: C.red, fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", fontWeight: 600, letterSpacing: "0.5px" }}>🗑️ Reset All Progress</button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "24px 0 12px", marginTop: 20 }}>
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: "3px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>Trade-offs, Not Textbook Answers</div>
        </div>
      </div>

      <ToastBar toast={toast} />
    </div>
  );
}
