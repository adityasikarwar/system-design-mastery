# React + Supabase + Vercel — Deployment Playbook

A self-contained recipe to ship a **React (CRA)** app with:
- Per-user persistence via Supabase (Postgres + Row-Level Security)
- Email magic-link auth (no OAuth setup needed)
- Free Vercel deploy from GitHub
- **Phase 2 (sections 11-13):** TypeScript conversion, modular file structure, UI polish

**How to use:** fill in the **Parameters** section below, hand this file to Claude, and say "execute the playbook." Claude will do everything except the steps explicitly marked **(human)** — those require your browser session in Supabase, GitHub, or Vercel.

**Phases:** sections 1-10 take a fresh app to a deployed, auth-gated app. Sections 11-13 are *enhancements* — run them on a working app (after section 10, or on an existing app) to add TypeScript, split a monolithic `App.js`, and polish the UI.

---

## 0. Parameters

Fill these in before starting. Everything else in this playbook references these names.

| Param | Example | Your value |
|---|---|---|
| `APP_NAME` | `task-tracker` | |
| `APP_DESCRIPTION` | `Personal task tracker` | |
| `LOCAL_DIR` | `C:\Users\Me\projects\task-tracker` | |
| `GITHUB_USERNAME` | `adityasikarwar` | |
| `GITHUB_REPO_URL` | `https://github.com/USERNAME/APP_NAME.git` | _(after creating repo in step 7)_ |
| `SUPABASE_PROJECT_URL` | `https://abc123.supabase.co` | _(after creating Supabase project in step 5)_ |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (long JWT) | _(after creating Supabase project in step 5)_ |
| `VERCEL_URL` | `https://app-name-xxxx.vercel.app` | _(after deploying in step 8)_ |

---

## 1. Bootstrap a new CRA app

```bash
npx create-react-app APP_NAME
cd APP_NAME
npm install @supabase/supabase-js
```

Verify it runs: `npm start` → http://localhost:3000 should show the React logo.

---

## 2. Drop in `src/supabase.js`

Create this file **as-is**. Generic, no app-specific logic.

```js
import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = (url && anonKey)
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const isSupabaseConfigured = () => !!supabase;

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithMagicLink(email) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  return { error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
```

---

## 3. Replace `src/index.js` with the storage shim

This shim auto-routes reads/writes to Supabase when signed in, localStorage when not. Anonymous users keep working; first sign-in migrates their localStorage data up.

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { supabase } from "./supabase";

const TABLE = "user_progress";   // Supabase table name (see step 5)
const COLUMN = "data";           // jsonb column name (see step 5)

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
        .from(TABLE)
        .select(COLUMN)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) return localGet(key);
      if (data && data[COLUMN]) return { value: JSON.stringify(data[COLUMN]) };
      // First sign-in: migrate localStorage up
      const local = localGet(key);
      if (local) {
        try {
          await supabase.from(TABLE).upsert({
            user_id: session.user.id,
            [COLUMN]: JSON.parse(local.value),
          });
        } catch (e) {}
        return local;
      }
      return null;
    },
    set: async (key, value) => {
      const session = await getSession();
      if (!session) return localSet(key, value);
      try {
        await supabase.from(TABLE).upsert({
          user_id: session.user.id,
          [COLUMN]: JSON.parse(value),
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
```

> **Inside the app**, persist with `await window.storage.set("anyKey", JSON.stringify(yourState))` and load with `const r = await window.storage.get("anyKey")`. Same call site works signed-in or anonymous.

---

## 4. Add auth state + login gate to `src/App.js`

The minimum additions to whatever `App.js` you have:

### 4a. Imports (top of file)

```jsx
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured, signInWithMagicLink, signOut } from "./supabase";
```

### 4b. State (inside `App()` component, near other `useState`)

```jsx
const [session, setSession] = useState(null);
const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
const [loginEmail, setLoginEmail] = useState("");
const [loginSending, setLoginSending] = useState(false);
const [loginSent, setLoginSent] = useState(false);
const [loginError, setLoginError] = useState("");
```

### 4c. Auth subscription (new `useEffect`)

```jsx
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
```

### 4d. Data-load effect (must re-run when user changes)

If your existing data load has a `[]` dependency, change it to `[authReady, session?.user?.id]` so it re-loads after sign-in/sign-out.

### 4e. Login gate (insert near the top of the render, before any main UI)

```jsx
if (isSupabaseConfigured() && authReady && !session) {
  const submitLogin = async () => {
    const email = loginEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError("Please enter a valid email address.");
      return;
    }
    setLoginError("");
    setLoginSending(true);
    const { error } = await signInWithMagicLink(email);
    setLoginSending(false);
    if (error) { setLoginError(error.message || "Could not send link. Try again."); return; }
    setLoginSent(true);
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>APP_NAME</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
          {loginSent ? "Check your email" : "Sign in to sync your progress"}
        </p>
        {loginSent ? (
          <>
            <div style={{ background: "#f0fdf4", border: "1px solid #22c55e40", borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.6 }}>
              We sent a one-time sign-in link to <strong>{loginEmail}</strong>. Click it to continue.
            </div>
            <button onClick={() => { setLoginSent(false); setLoginEmail(""); }} style={{ marginTop: 16, background: "transparent", border: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Use a different email</button>
          </>
        ) : (
          <>
            <input
              type="email"
              value={loginEmail}
              onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }}
              onKeyDown={e => { if (e.key === "Enter") submitLogin(); }}
              placeholder="you@example.com"
              autoFocus
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${loginError ? "#ef4444" : "#e5e7eb"}`, fontSize: 14, outline: "none", marginBottom: 10, boxSizing: "border-box" }}
            />
            {loginError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>{loginError}</div>}
            <button disabled={loginSending} onClick={submitLogin} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loginSending ? "wait" : "pointer", opacity: loginSending ? 0.7 : 1 }}>
              {loginSending ? "Sending..." : "Send magic link"}
            </button>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 16 }}>No password needed.</div>
          </>
        )}
      </div>
    </div>
  );
}
```

### 4f. Logout button (somewhere in your header, only when signed in)

```jsx
{session && (
  <button onClick={signOut} title={"Signed in as " + session.user.email}>
    👤 {session.user.email}
  </button>
)}
```

---

## 5. Create the Supabase project **(human)**

### 5a. Make the project
1. https://supabase.com → **New project** → free tier.
2. Pick a name + region, save the DB password.
3. Wait ~2 min for provisioning.

### 5b. Run the schema SQL
**SQL Editor → New query** → paste and run:

```sql
create table public.user_progress (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

create policy "read own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "insert own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "update own progress"
  on public.user_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 5c. Auth → URL Configuration
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/**`

(Production URL gets added in step 9.)

### 5d. Auth → Providers → Email
Confirm **Email** provider is enabled (default on). No other changes.

### 5e. Settings → API Keys
Copy:
- **Project URL** → goes into `REACT_APP_SUPABASE_URL`
- **anon public** key (long JWT, NOT `service_role`) → goes into `REACT_APP_SUPABASE_ANON_KEY`

Paste both back into the **Parameters** table at the top of this playbook.

---

## 6. Local env + .gitignore

### 6a. Create `.env.example` (committed, for reference)

```
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```

### 6b. Create `.env.local` (gitignored, with real values)

```
REACT_APP_SUPABASE_URL=PASTE_SUPABASE_PROJECT_URL_HERE
REACT_APP_SUPABASE_ANON_KEY=PASTE_SUPABASE_ANON_KEY_HERE
```

### 6c. Extend `.gitignore`

Add these lines:
```
.env
.env.local
.env.*.local
.claude/
```

### 6d. Local test
```bash
npm start
```
Open http://localhost:3000 → you should see the sign-in card. Type your email → check inbox → click magic link → you're back, signed in. Verify a row appears in `user_progress` in the Supabase dashboard.

---

## 7. Push to GitHub **(human creates repo, Claude pushes)**

### 7a. **(human)** Create empty GitHub repo
1. https://github.com/new
2. Name: `APP_NAME`
3. **Public** or **Private** — both work with Vercel free tier.
4. ⚠️ **Do NOT** check "Add README" / "Add .gitignore" / "Add license".
5. Click **Create**.
6. Copy the **HTTPS URL** (`https://github.com/USERNAME/APP_NAME.git`). Paste into the **Parameters** table.

### 7b. Claude: init + push
```bash
git init -b main
git add .
git commit -m "Initial commit: APP_NAME with Supabase auth"
git remote add origin GITHUB_REPO_URL
git push -u origin main
```

(On first push, Git Credential Manager opens a browser window for GitHub authorization.)

### 7c. Safety check
```bash
git grep -E "eyJ[A-Za-z0-9+/=._-]{50,}"
```
Should return nothing — confirms no JWT secrets are in tracked files.

---

## 8. Deploy to Vercel **(human)**

1. https://vercel.com/signup → **Continue with GitHub**.
2. Dashboard → **Add New → Project**.
3. Find `APP_NAME` in the repo list → **Import**.
4. **Framework Preset**: auto-detects as **Create React App**. Leave defaults.
5. **Expand Environment Variables**. Add **both**:

   | Name | Value |
   |---|---|
   | `REACT_APP_SUPABASE_URL` | (from Parameters) |
   | `REACT_APP_SUPABASE_ANON_KEY` | (from Parameters) |

   Apply to Production + Preview + Development.
6. Click **Deploy**. Wait ~60s for the build.
7. Copy the live URL (`https://app-name-xxxx.vercel.app`). Paste into the **Parameters** table.

---

## 9. Update Supabase URLs for production **(human)**

This is the step everyone forgets. Without it, magic-link emails still redirect to `localhost:3000` and break sign-in for real users.

Go to **Supabase → Authentication → URL Configuration**:

- **Site URL** → change to `VERCEL_URL` (the `https://app-name-xxxx.vercel.app` value)
- **Redirect URLs** → ensure BOTH are listed:
  ```
  http://localhost:3000/**
  VERCEL_URL/**
  ```

Click **Save**.

---

## 10. End-to-end verification

Open `VERCEL_URL` in an **incognito window** (no cached session). You should:

1. See the sign-in card (proves env vars loaded on Vercel).
2. Submit email → email arrives → link points to `VERCEL_URL` (not localhost) → click → signed in.
3. Modify some state → check the corresponding row in `user_progress` in Supabase.
4. Open the URL on a phone, sign in with the same email → progress syncs.

---

## 11. Convert to TypeScript (loose mode)

> **Run this on a working app** (after section 10, or on any existing CRA app).

### 11a. ⚠️ Install the RIGHT versions

```bash
npm install --save-dev typescript@^4.9.5 "@types/react@^18.3.3" "@types/react-dom@^18.3.0" "@types/node@^20"
```

**CRITICAL — do not use TypeScript 5.x.** `react-scripts@5.0.1` declares
`peerOptional typescript@"^3.2.1 || ^4"`. Local `npm install` is lenient and
*will* let TS 5 through — but Vercel runs `npm ci`, which strictly enforces
peer deps and fails with `ERESOLVE` before the build even starts. Symptom:
local builds pass, Vercel never deploys. Pin **`typescript@^4.9.5`** (last 4.x).
Same logic: keep `@types/react` on **18.x** (matches React 18), not 19.x.

### 11b. Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2018",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "noImplicitAny": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

### 11c. Rename source files (preserve git history)

```bash
git mv src/supabase.js src/supabase.ts
git mv src/index.js src/index.tsx
git mv src/App.js src/App.tsx
```

### 11d. Add `src/global.d.ts` (types the `window.storage` shim)

```ts
interface StorageShim {
  get: (key: string) => Promise<{ value: string } | null>;
  set: (key: string, value: string) => Promise<{ value: string } | null>;
}
interface Window {
  storage?: StorageShim;
}
```

### 11e. Add `src/types.ts` (shared app types — adapt the `UserData` shape to your app)

```ts
export type ThemeName = "dark" | "light";

export interface UserData {
  // ...whatever your app persists. Example:
  done: Record<string, boolean>;
  notes: Record<string, string>;
  theme?: ThemeName;
}
```

### 11f. Fix the common build errors (loose mode — `any` is acceptable here)

Run `CI=true npm run build` and fix what it reports. The recurring ones:

| Error | Fix |
|---|---|
| Inferred-prop-type conflict on an inline component (`const B = ({ x, y }) =>`) | Annotate the destructured props: `({ x, y }: any)` |
| `Property 'x' does not exist on type 'unknown'` from `Object.entries(...)` | Type the source state: `useState<UserData>({...})` |
| `useState(null)` then `.foo` access fails | `useState<MyType \| null>(null)` (or `useState<any>(null)`) |
| `Type 'string' is not assignable to 'TextAlign'` on a style **const** | Annotate it `: React.CSSProperties` and add `import React from "react"` |
| Mixed array (`[...A, ...B]`) → union-type access errors | Annotate `const items: any[] = [...]` |
| `'X' is defined but never used` | Remove the unused import (CI mode treats it as an error) |

### 11g. Verify like Vercel does

```bash
rm -rf node_modules && npm ci && CI=true npm run build
```

**Always test with `npm ci`, not just `npm install`** — see section 11a.

---

## 12. Split the monolith into modules

> Goal: a 2,000+ line `App.tsx` → a thin `App.tsx` + focused modules.

Recommended target structure:
```
src/
  App.tsx          (orchestrator — state, effects, view routing)
  index.tsx
  supabase.ts
  types.ts
  global.d.ts
  theme.ts         (color palettes / design tokens)
  data.ts          (all static content arrays/constants)
  diagrams.tsx     (SVG / chart components, if any)
  components/      (leaf components: Toast, Badge, LoginGate, Header, ...)
```

### 12a. Extract `theme.ts`
Move palette/token constants out. Pure data, zero dependencies — safest first move.

### 12b. Extract `data.ts`
Move all static content constants. **Gotcha:** if a data constant references a
theme color (e.g. `c: C.purple`) and `C` is a module-level value frozen at load
time, substitute the literal/frozen reference (e.g. `c: DARK.purple`) so the
extracted file has no dependency on mutable app state.

### 12c. Extract components that use a *mutable* module-level theme
If your app has a `let C = DARK` reassigned each render, components in other files
can't see it. Pattern: give the new module its own `let C` plus a setter, and call
the setter from `App`'s render:
```ts
// diagrams.tsx
import { DARK, LIGHT } from "./theme";
let C = DARK;
export const setDiagramTheme = (isDark: boolean) => { C = isDark ? DARK : LIGHT; };
```
```tsx
// App.tsx render — keep in sync each render
C = theme === "dark" ? DARK : LIGHT;
setDiagramTheme(theme === "dark");
```

### 12d. Extract leaf components into `components/`
Components that need the theme take it as a prop: `<LoginGate C={C} />`. Components
with self-contained state (e.g. a login form) should *own that state* internally —
move the `useState`s out of `App` and into the component.

**After each extraction, run `CI=true npm run build`.** Commit per logical group so a
broken step is easy to bisect.

---

## 13. UI polish checklist

Safe, high-value passes — all additive, low regression risk.

### 13a. Font scale
If text is cramped, bump every `fontSize` proportionally (e.g. +3px) in **descending
order** so replacements don't compound:
```bash
sed -i -E 's/fontSize: 20\b/fontSize: 23/g; s/fontSize: 18\b/fontSize: 21/g; ...' src/App.tsx
```

### 13b. Widen layout
`sed -i -E 's/maxWidth: 1100\b/maxWidth: 1400/g' src/App.tsx`

### 13c. Toast notifications
Add a `toast` state + a `showToast(msg, kind?)` helper, fire it from your `save()`
function, render a fixed-position `<ToastBar>` component. Auto-dismiss ~1.8s.

### 13d. Global CSS polish (add to your `<style>` block or index.css)
```css
html { scroll-behavior: smooth; }
body { line-height: 1.55; -webkit-text-size-adjust: 100%; }
button, input, textarea, a { -webkit-tap-highlight-color: transparent; }
*:focus-visible { outline: 2px solid ACCENT; outline-offset: 2px; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
@media (max-width: 640px) {
  .card:hover, .btn:hover { transform: none; }
}
```

### 13e. ⚠️ Hardcoded-color audit (catches text invisible in one theme)
The #1 theming bug: a color hardcoded for dark mode (e.g. `"#e5e7eb"`) is invisible
on a light background, and vice-versa. Find them:
```bash
grep -noE 'color: "#[0-9a-fA-F]{3,8}"' src/App.tsx          # direct
grep -noE 'color: [^,}]*"#[0-9a-fA-F]{3,8}"' src/App.tsx     # incl. ternaries
```
Replace each with a theme token (`C.headText`, `C.green`, etc.). The only hardcoded
colors that are OK are ones on a fixed-color background (e.g. `#000` on an amber button).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Login card never appears | Env vars not loaded | Restart `npm start`; verify `.env.local` exists; check Vercel env-var screen |
| `relation "user_progress" does not exist` | SQL didn't run | Re-run step 5b |
| Magic-link email never arrives | Free-tier rate limit (30/hr) or wrong email | Wait; check **Auth → Logs** in Supabase |
| Magic link redirects to localhost from production | Site URL not updated | Step 9 |
| User signs in but sees blank app / no data | RLS policy missing | Re-run step 5b's `create policy` blocks |
| Vercel build fails with `Treating warnings as errors` | CRA lints in CI mode | Fix the actual warning (don't suppress); or, last resort, set `CI=false` in Vercel env vars |
| **Local build passes but Vercel never deploys** | `npm ci` hit an `ERESOLVE` peer-dep conflict (often TypeScript 5.x vs react-scripts 5) | Pin `typescript@^4.9.5`; verify with `rm -rf node_modules && npm ci` before pushing (section 11a/11g) |
| **Text invisible in light (or dark) mode** | A color hardcoded for one theme | Hardcoded-color audit, section 13e |
| `Failed to fetch dynamically imported module` after deploy | Old service worker cached | Hard refresh; or disable PWA if you don't need it |

---

## Cost summary

| Service | Free tier | When you'd hit it |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth/mo, unlimited deploys | Real public traffic |
| Supabase Free | 500 MB DB, 50K MAU, 30 emails/hr | Real userbase (still generous) |
| GitHub | Unlimited public + private repos | Never for a single app |
| Domain | `*.vercel.app` subdomain | Want a real `.com` |

**Total: $0/month** for a side project.

If you need a custom domain later, add it in Vercel → Project → Domains. Cheapest registrars: Porkbun, Namecheap, Cloudflare Registrar. `.xyz` runs ~$1-2/yr year-one, ~$10/yr after; `.com` runs ~$10-15/yr. **Don't bother with Freenom (.tk/.ml etc.)** — that service is dead.

---

## Notes for future Claude

If the user pastes this playbook and says "execute it for app X":
- Read the **Parameters** table — if `LOCAL_DIR`, `APP_NAME`, `GITHUB_USERNAME` are missing, ask once and proceed.
- Steps marked **(human)** require dashboard / browser access you don't have. Walk the user through them with precise click paths; verify their output before moving on.
- Steps NOT marked **(human)** are yours: create files exactly as shown, init git, run `git push`.
- Each code block is copy-paste-ready; do not paraphrase or "modernize" the snippets without checking with the user first.
- **Section 11a is non-negotiable: TypeScript MUST be 4.9.x, not 5.x.** The whole point of that warning is that the failure is invisible locally and only shows up as a silent non-deploy on Vercel.
- After ANY dependency change, verify with `rm -rf node_modules && npm ci && CI=true npm run build` — `npm install` alone will not catch peer-dep conflicts that break Vercel.
- Sections 1-10 = fresh-app setup. Sections 11-13 = enhancements; only run them if the user asks, and run each sub-step then build before moving on.
- After step 10 (or, for Phase 2, after a clean `npm ci` build) passes, you're done.
