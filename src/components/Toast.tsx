import { Toast as ToastType } from "../types";

// Bottom-center toast. State lives in App (save() triggers it); this just renders.
export default function Toast({ toast }: { toast: ToastType | null }) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      className="toast-pop"
      style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 200, padding: "10px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600,
        letterSpacing: "0.3px", fontFamily: "'DM Sans', sans-serif", color: "#fff",
        background: toast.kind === "err"
          ? "linear-gradient(135deg, #ef4444, #b91c1c)"
          : "linear-gradient(135deg, #10b981, #059669)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset",
        display: "flex", alignItems: "center", gap: 8, pointerEvents: "none",
      }}
    >
      {toast.msg}
    </div>
  );
}
