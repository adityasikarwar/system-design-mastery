import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { supabase } from "./supabase";

// Storage shim: Supabase row when signed in, localStorage otherwise.
// Anonymous users keep working; on first sign-in their localStorage data
// is migrated up to Supabase so they don't lose progress.
if (typeof window !== "undefined" && !window.storage) {
  const localGet = (key) => {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? { value: v } : null;
    } catch (e) { return null; }
  };
  const localSet = (key, value) => {
    try { localStorage.setItem(key, value); return { value }; } catch (e) { return null; }
  };

  const getSession = async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  };

  window.storage = {
    get: async (key) => {
      const session = await getSession();
      if (!session) return localGet(key);
      const { data, error } = await supabase
        .from("user_progress")
        .select("data")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) return localGet(key);
      if (data && data.data) return { value: JSON.stringify(data.data) };
      // First sign-in for this user: migrate any local progress up
      const local = localGet(key);
      if (local) {
        try {
          await supabase
            .from("user_progress")
            .upsert({ user_id: session.user.id, data: JSON.parse(local.value) });
        } catch (e) {}
        return local;
      }
      return null;
    },
    set: async (key, value) => {
      const session = await getSession();
      if (!session) return localSet(key, value);
      try {
        await supabase
          .from("user_progress")
          .upsert({
            user_id: session.user.id,
            data: JSON.parse(value),
            updated_at: new Date().toISOString(),
          });
        return { value };
      } catch (e) {
        return localSet(key, value);
      }
    },
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
