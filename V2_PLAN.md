# Wordle Dordle V2 — Implementation Plan

Multi-competition + accounts rebuild. Work on branch `v2` — live site on `main` is never touched.

---

## Branch Strategy

```bash
git checkout -b v2
git push -u origin v2
```

If on **Netlify**: go to Site Settings → Branch deploys → enable `v2`.
You'll get a separate preview URL (e.g. `v2--your-site.netlify.app`) that's live and testable
while `main` keeps serving the family uninterrupted.

If on **Vercel**: it creates preview deployments automatically for every branch push.

Development workflow:
- All v2 work happens on `v2` branch
- `main` gets only bug fixes and small polish (cherry-pick as needed)
- When v2 is ready: `git checkout main && git merge v2` → deploy → done

---

## Stage 1 — Multi-Competition (No Auth)

**Goal:** Anyone with an invite code can join or create a competition. The app becomes
competition-scoped. No login required — still trust-based submission like today.

**Estimated effort:** 2–3 days

### What changes conceptually

Today the app is hardcoded to one competition (Jeff, Tristan, Nana, Daniel, Caleb).
After Stage 1, the app loads a competition from a short code stored in localStorage or
the URL. Everything — leaderboard, history, avatars, celebration — is scoped to that
competition. Multiple families can each have their own competition running simultaneously.

---

### 1.1 Database Changes

Run in Supabase SQL editor on the **v2** project (create a new Supabase project for v2,
or use the same project with the new tables alongside existing ones during dev).

```sql
-- Competitions table
create table competitions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique,
  prize_amount integer default 100,
  season_year  integer not null default extract(year from now()),
  created_at   timestamptz default now()
);

-- Competition members (players in a competition)
create table competition_members (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references competitions(id) on delete cascade,
  display_name    text not null,           -- "Jeff", "Caleb", etc.
  color           text,                    -- hex color for this player
  joined_at       timestamptz default now(),
  unique(competition_id, display_name)
);

-- Scores — add competition_id
-- (new table; existing scores table stays for the legacy site on main)
-- NOTE: id is client-set (Date.now()), not auto-increment.
-- NOTE: "puzzleNum" is quoted to preserve camelCase — matches the JS insert field name.
create table scores_v2 (
  id              bigint primary key,
  competition_id  uuid references competitions(id) on delete cascade,
  player          text not null,
  "puzzleNum"     text not null,           -- quoted camelCase to match JS
  score           text not null,           -- '1'-'6' or 'X'
  date            timestamptz not null,
  month           integer not null,
  year            integer not null,
  unique(competition_id, player, "puzzleNum")
);

-- Congrats — add competition_id
create table congrats_v2 (
  id              bigserial primary key,
  competition_id  uuid references competitions(id) on delete cascade,
  from_player     text not null,
  to_player       text not null,
  month           integer not null,
  year            integer not null,
  unique(competition_id, from_player, to_player, month, year)
);

-- Avatars — add competition_id scope
create table avatars_v2 (
  competition_id  uuid references competitions(id) on delete cascade,
  player          text not null,
  config          jsonb not null,
  updated_at      timestamptz default now(),
  primary key(competition_id, player)
);

-- RLS (open for now — Stage 2 will lock these down with auth)
alter table competitions        enable row level security;
alter table competition_members enable row level security;
alter table scores_v2           enable row level security;
alter table congrats_v2         enable row level security;
alter table avatars_v2          enable row level security;

create policy "public read competitions"        on competitions        for select using (true);
create policy "public read members"             on competition_members for select using (true);
create policy "public read scores"              on scores_v2           for select using (true);
create policy "public insert scores"            on scores_v2           for insert with check (true);
create policy "public read congrats"            on congrats_v2         for select using (true);
create policy "public insert congrats"          on congrats_v2         for insert with check (true);
create policy "public read avatars"             on avatars_v2          for select using (true);
create policy "public upsert avatars"           on avatars_v2          for insert with check (true);
create policy "public update avatars"           on avatars_v2          for update using (true);
create policy "public insert competitions"      on competitions        for insert with check (true);
create policy "public insert members"           on competition_members for insert with check (true);
```

---

### 1.2 New App Flow

**On first visit (no competition in localStorage):**
```
┌─────────────────────────────────┐
│        WORDLE DORDLE            │
│                                 │
│  [ CREATE A COMPETITION ]       │
│  [ JOIN WITH INVITE CODE ]      │
└─────────────────────────────────┘
```

**Create flow:**
1. Enter competition name (e.g. "Family Wordle 2026")
2. Add player names + pick colors
3. System generates a 6-char invite code (e.g. `FAM-26`)
4. Creator picks their own display name
5. Competition + members written to Supabase
6. Competition ID + invite code saved to localStorage
7. App loads into the normal leaderboard view

**Join flow:**
1. Enter invite code
2. Supabase lookup → fetch competition + members
3. Pick your display name from the member list
4. Save to localStorage
5. App loads into leaderboard view

**Returning visit:**
- `competition_id` in localStorage → skip landing, load app directly

---

### 1.3 Files to Create

```
js/competition.js      — competition context: load, create, join, switch
js/landing.js          — landing screen (create/join UI)
landing.html           — OR: gate the main index.html behind a JS check
```

### 1.4 Files to Heavily Modify

| File | What changes |
|------|-------------|
| `js/config.js` | Remove hardcoded `PLAYERS`, `PLAYER_COLORS`. These become dynamic from `competition_members`. Add `currentCompetition` global object. |
| `js/data.js` | All Supabase queries get `.eq('competition_id', currentCompetition.id)`. Switch table names to `scores_v2`, etc. |
| `js/leaderboard.js` | Uses `PLAYERS` in many places — replace with `currentCompetition.members` array. |
| `js/history.js` | History filters built from member list dynamically. |
| `js/submit.js` | Player select populated from members. Quick submit knows current user's name from localStorage. |
| `js/profile.js` | Avatar load/save needs `competition_id`. |
| `js/app.js` | Startup: check competition context before `renderAll()`. |
| `index.html` | Player name hardcoded in `<select>` and history filter buttons — make these dynamic. |
| `css/styles.css` | Add landing screen styles, competition switcher styles. |

### 1.5 New Global State

```js
// competition.js
let currentCompetition = null;
// {
//   id: 'uuid',
//   name: 'Family Wordle 2026',
//   invite_code: 'FAM-26',
//   members: [{ display_name: 'Jeff', color: '#e67e22' }, ...]
// }

let currentPlayer = null; // display_name of the person using this device
```

### 1.6 Invite Code Generation

```js
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  return Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    + '-'
    + Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
// → "FAM-26K", "XRT-9PQ", etc.
```

### 1.7 Migration of Existing Data (for the family)

When v2 goes live, run a one-time migration to preserve 2026 scores:

```sql
-- 1. Insert the family competition
insert into competitions (id, name, invite_code, prize_amount, season_year)
values ('your-chosen-uuid', 'Family Wordle 2026', 'FAM-26', 100, 2026);

-- 2. Insert members
insert into competition_members (competition_id, display_name, color) values
  ('your-chosen-uuid', 'Jeff',    '#e67e22'),
  ('your-chosen-uuid', 'Tristan', '#9b59b6'),
  ('your-chosen-uuid', 'Nana',    '#e74c3c'),
  ('your-chosen-uuid', 'Daniel',  '#3498db'),
  ('your-chosen-uuid', 'Caleb',   '#1abc9c');

-- 3. Copy scores
insert into scores_v2 (competition_id, player, puzzle_num, score, date, month, year)
select 'your-chosen-uuid', player, "puzzleNum", score::text, date::timestamptz, month, year
from scores;

-- 4. Copy avatars
insert into avatars_v2 (competition_id, player, config, updated_at)
select 'your-chosen-uuid', player, config, updated_at
from avatars;
```

Each family member visits v2, enters invite code `FAM-26`, picks their name — done.

---

## Stage 2 — Supabase Auth (Real Accounts)

**Goal:** Every player has a real account. Scores are tied to user IDs, not text names.
Proper Row Level Security. Eliminates the "anyone can submit as Jeff" problem.

**Estimated effort:** 3–5 days (on top of Stage 1)

**Why Supabase Auth, not Firebase:**
You're already on Supabase. Their auth system integrates directly with Postgres RLS — 
`auth.uid()` is available in policy expressions. Adding Firebase Auth would mean two 
separate auth systems that need to stay in sync. No reason for that complexity.

---

### 2.1 Auth Methods to Support

- **Email + password** — simplest, works everywhere
- **Magic link** — email a login link, no password needed (great for non-technical family members)
- **Google OAuth** — optional, easy to add later

Recommendation: start with **magic link** — family members just enter their email and get
a tap-to-login link. No password to forget.

---

### 2.2 Database Changes

```sql
-- Add user_id to all tables, keep display_name for backwards compat during transition

alter table competition_members
  add column user_id uuid references auth.users(id);
-- nullable at first; set when user claims their member slot

alter table scores_v2
  add column user_id uuid references auth.users(id);
-- fill from competition_members after user claims their slot

alter table congrats_v2
  add column from_user_id uuid references auth.users(id),
  add column to_user_id   uuid references auth.users(id);

alter table avatars_v2
  add column user_id uuid references auth.users(id);

-- Profiles table (public user metadata)
create table profiles (
  id            uuid primary key references auth.users(id),
  display_name  text,
  created_at    timestamptz default now()
);
```

### 2.3 Tightened RLS Policies

Replace the open Stage 1 policies with real ones:

```sql
-- Scores: users can only insert their own scores
drop policy "public insert scores" on scores_v2;
create policy "auth insert own scores" on scores_v2
  for insert with check (auth.uid() = user_id);

-- Scores: read only competitions you're a member of
drop policy "public read scores" on scores_v2;
create policy "member read scores" on scores_v2
  for select using (
    competition_id in (
      select competition_id from competition_members where user_id = auth.uid()
    )
  );

-- Avatars: only update your own
drop policy "public update avatars" on avatars_v2;
create policy "own avatar update" on avatars_v2
  for update using (user_id = auth.uid());

-- Congrats: only insert your own
drop policy "public insert congrats" on congrats_v2;
create policy "auth insert congrats" on congrats_v2
  for insert with check (from_user_id = auth.uid());
```

### 2.4 "Claiming" a Member Slot

When the Stage 1 family competition already has data and a user signs up, they need to
claim their existing `competition_member` row:

```
Sign up flow:
1. User signs up with email
2. They enter invite code → find competition
3. They pick their display name from the member list
4. System sets competition_members.user_id = auth.uid() for that row
5. All existing scores with player = display_name remain valid
```

### 2.5 New Files

```
js/auth.js          — (already exists, expand it)
                      supabase.auth.signUp / signIn / signOut
                      onAuthStateChange listener
                      session persistence
components/
  auth-modal.html   — sign in / sign up / magic link UI (can be inline in index.html)
```

### 2.6 Auth State in the App

```js
// On every page load, before rendering:
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  showAuthModal(); // block the app until signed in
  return;
}
currentUserId = session.user.id;
// then load competition context and render
```

### 2.7 Modified Submit Flow

Stage 1: submit uses `display_name` from localStorage
Stage 2: submit uses `auth.uid()` to look up the user's `competition_member` row,
then writes `user_id` to the score instead of (or alongside) `player` text.

---

## Stage 3 — Competition Management UI

**Goal:** Full self-service dashboard. Create competitions, invite members, manage settings,
view/archive past seasons.

**Estimated effort:** 2–3 days (on top of Stage 2)

---

### 3.1 New Screens / Tabs

```
Dashboard (post-login landing)
├── My Competitions
│   ├── [Competition Card] Family Wordle 2026  ← click to enter
│   ├── [Competition Card] Office Pool 2026
│   └── [ + Create New Competition ]
│
└── [ Join with Invite Code ]

Competition Settings (accessible from within a competition)
├── Rename competition
├── Change prize amount
├── Member management
│   ├── View all members + their invite status
│   ├── Remove a member (owner only)
│   └── Regenerate invite code
├── Archive season (closes competition, freezes scores)
└── Delete competition (owner only)
```

### 3.2 Additional Database Changes

```sql
-- Track invites
create table invites (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references competitions(id) on delete cascade,
  invited_email   text,          -- optional: pre-invite a specific person
  used_by         uuid references auth.users(id),
  used_at         timestamptz,
  created_at      timestamptz default now()
);

-- Competition settings / metadata expansion
alter table competitions
  add column is_archived   boolean default false,
  add column max_members   integer default 20,
  add column rules_text    text;   -- custom rules override
```

### 3.3 Competition Switcher UI

Users who are in multiple competitions need a way to switch between them without
re-entering invite codes. Add a switcher to the header:

```
┌──────────────────────────────────────┐
│ WORDLE DORDLE     [Family 2026 ▾]    │
│                   ├ Family 2026 ✓   │  
│                   ├ Office Pool      │
│                   └ + New            │
└──────────────────────────────────────┘
```

Clicking a competition re-loads the entire app context for that competition.

### 3.4 Owner vs Member Permissions

| Action | Owner | Member |
|--------|-------|--------|
| View leaderboard | ✓ | ✓ |
| Submit scores | ✓ | ✓ |
| Delete own scores | ✓ | ✓ |
| Delete any score | ✓ | ✗ |
| Invite members | ✓ | ✓ (optional setting) |
| Remove members | ✓ | ✗ |
| Rename competition | ✓ | ✗ |
| Archive season | ✓ | ✗ |
| Delete competition | ✓ | ✗ |

```sql
-- Add role enforcement to RLS
create policy "owner can delete any score" on scores_v2
  for delete using (
    competition_id in (
      select competition_id from competition_members
      where user_id = auth.uid() and role = 'owner'
    )
  );
```

---

## File Change Summary (all stages)

```
js/
  config.js          ★ Major rewrite — remove hardcoded PLAYERS
  data.js            ★ Major rewrite — all queries competition-scoped
  leaderboard.js     ★ Major rewrite — dynamic members
  submit.js          ● Moderate — auth-aware submit
  history.js         ● Moderate — dynamic filters
  profile.js         ● Moderate — competition-scoped avatars
  app.js             ● Moderate — auth + competition gate on startup
  auth.js            ★ Major expand — full auth flow
  competition.js     ✦ New — competition CRUD, context management
  landing.js         ✦ New — create/join landing screen
  dashboard.js       ✦ New (Stage 3) — multi-competition dashboard

css/
  styles.css         ● Moderate additions — landing, auth modal, dashboard
  
index.html           ● Moderate — dynamic player selects, auth modal, competition header

New HTML files:
  landing.html       OR gate handled in index.html via JS
```

Legend: ★ Major rewrite · ● Moderate changes · ✦ New file

---

## Recommended Order of Work

```
Stage 1
  □ Create new Supabase project (or new tables alongside existing)
  □ Run Stage 1 SQL schema
  □ Build competition.js (create/join/load context)
  □ Build landing screen UI
  □ Refactor config.js to use dynamic members
  □ Update data.js queries (add competition_id everywhere)
  □ Update leaderboard.js, history.js, submit.js, profile.js
  □ Test: create competition, join from a second device, submit scores
  □ Run data migration script for family's existing data
  □ Merge v2 → main, share new invite code with family

Stage 2
  □ Enable Supabase Auth in dashboard
  □ Build auth modal (magic link first, add password later)
  □ onAuthStateChange wiring in app.js
  □ Member claim flow (sign up → pick display name)
  □ Tighten RLS policies
  □ Update submit to use user_id
  □ Test: sign up, claim slot, submit, verify RLS blocks wrong submissions
  □ Roll out to family (everyone signs up, claims their name)

Stage 3
  □ Dashboard screen (list competitions, create new, join)
  □ Competition settings panel
  □ Competition switcher in header
  □ Invite management (track who's joined, regenerate code)
  □ Archive season flow
  □ Owner-only delete/remove controls
```

---

## Notes & Decisions to Make Before Starting

1. **Same Supabase project or new one for v2?**
   New project is cleaner — no risk of affecting live data during dev. Use the existing
   project only after migration is tested and ready. Update `SUPABASE_URL` and
   `SUPABASE_KEY` in `js/config.js` on the v2 branch.

2. **`index.html` vs separate `landing.html`?**
   Single `index.html` with a JS gate is simpler to deploy. Landing screen renders if no
   competition in localStorage, otherwise the app renders. No redirect needed.

3. **Keep `player` text column in Stage 2?**
   Yes, keep it alongside `user_id` during the transition. It acts as a fallback display
   name and makes migration easier. Can remove in a future cleanup.

4. **What happens to the current live site when v2 launches?**
   Nothing — `main` branch stays live until v2 is explicitly merged. Family gets the new
   invite code, signs up on v2, and the old site is just frozen history.
