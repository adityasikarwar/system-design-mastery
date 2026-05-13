# Supabase + Google OAuth Setup

This app supports two modes:

- **Anonymous (default)** — no env vars set, progress saved to `localStorage` only.
- **Signed-in** — set the two env vars below, sign in with an emailed magic link, progress synced to Supabase.

You only need this guide if you want signed-in mode. **No Google Cloud / GitHub setup required** — Supabase sends the sign-in emails itself.

---

## 1. Create the Supabase project

1. Go to https://supabase.com, sign up (free), and click **New project**.
2. Pick any name and region. Save the **database password** somewhere safe.
3. Wait ~2 minutes for the project to provision.

## 2. Create the table and Row-Level Security policies

Open the project → **SQL Editor** → **New query** → paste and run:

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

> The RLS policies guarantee a logged-in user can only read/write their own row, even though the frontend uses the public anon key.

## 3. Enable email magic links

1. In Supabase: **Authentication → Providers → Email** → make sure **"Enable Email Provider"** is **on** (it is by default).
2. Make sure **"Enable email confirmations"** is **on**. Magic links use the same flow — clicking the link both confirms and signs the user in.
3. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` for local dev. Change to your production URL after deploy.
   - **Redirect URLs**: add `http://localhost:3000` and your production URL.

That's it — no Google Cloud, no GitHub OAuth, no payment prompts. Supabase sends the sign-in emails using its built-in mailer.

> **Free-tier email limits:** ~30 emails/hour, 100/day. Plenty for a personal/learning app. If you outgrow it, plug in your own SMTP (SendGrid, Resend, etc.) under **Authentication → Email Templates → SMTP Settings**.

### Optional: customize the email template

**Authentication → Email Templates → Magic Link**. The default works fine; tweak subject/body if you want.

## 4. Get the frontend env vars

In Supabase: **Settings → API**. Copy:

- **Project URL** → `REACT_APP_SUPABASE_URL`
- **anon / public key** → `REACT_APP_SUPABASE_ANON_KEY`

> The anon key is safe to expose in client-side code. RLS is what protects user data — never share the `service_role` key.

## 5. Configure locally

```bash
cp .env.example .env.local
# edit .env.local and paste the two values
npm start
```

You should see a sign-in screen with an email input. Type your email → click **Send magic link** → check your inbox → click the link → you'll be redirected back signed in. A row appears in `public.user_progress` with your `done`/`weak`/`notes`/`sr` JSON.

## 6. Configure on your host

### Vercel
**Project Settings → Environment Variables** → add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` for Production, Preview, and Development. Redeploy.

### Netlify
**Site settings → Environment variables** → add the same two. Trigger a new deploy.

### GitHub Pages / static host
CRA inlines `REACT_APP_*` env vars at build time. Set them in your CI/build environment before running `npm run build`.

After adding the production domain, **update Supabase's Site URL and Redirect URLs** (Authentication → URL Configuration) to include it — otherwise the magic link will keep redirecting to localhost.

## Notes

- **First sign-in migration:** if a user has anonymous progress in `localStorage`, it's automatically uploaded to Supabase on their first sign-in.
- **Free-tier limits:** 500 MB DB, 50K monthly active users, unlimited API requests. Plenty for a side project.
- **Pausing:** Supabase pauses free projects after 7 days of inactivity. One API call from the app un-pauses it.
