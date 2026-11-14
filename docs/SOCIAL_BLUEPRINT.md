# PERSONA 90 — Social Features Blueprint

**Status:** research and design, for review before implementation
**Scope:** invite friends, share progress, groups ("circles"), comparison, races / challenges
**Constraint:** free to run (no paid services), private by default, safe for a personal-development app

---

## 1. Why add social features (and the risks)

**Evidence for:** social accountability raises follow-through. Telling a peer about a goal and reporting progress improves completion (Matthews, Dominican University study; "commitment devices"). Practising *with* others normalises the discomfort the programme trains (speaking up, disagreeing). Small groups with shared goals outperform solo apps on retention (Strava clubs, Duolingo friends and quests).

**Risks specific to this app:**

| Risk | Why it matters here | Design response |
|---|---|---|
| Unhealthy comparison | Users are working on confidence and fear of judgement; ranking *scores* can trigger exactly the anxiety we are training against | Compare **effort** (sessions, streaks, challenges) by default. Skill scores are shared only if the user explicitly opts in, and never ranked publicly. |
| Privacy of sensitive content | Check-ins, reflections, journal and coach chats are deeply personal | These are **never shareable**, technically impossible to expose (not just hidden in the UI). |
| Social pressure / shame | Leaderboards can demotivate people at the bottom | Personal-best framing, "most improved", team races, and the ability to hide from leaderboards at any time. |
| Abuse and spam | Invites and groups can be misused | Invite-only, expiring links, rate limits, block and report, group owner moderation. |

**Principle:** *social features support practice; they never expose inner work.*

---

## 2. Concept

1. **Invite** a friend with a personal link or QR code (WhatsApp, Instagram or SMS share sheet — free).
2. **Connect**: when they join (or already have an account), you become friends after both sides agree.
3. **Share** exactly what you choose, per friend or per group, from a fixed list of safe items.
4. **Circles** (groups of 2–30): create, invite, see each other's shared progress.
5. **Compare** with a friend or across a circle: effort, consistency and (opt-in) growth.
6. **Race**: time-boxed challenges (for example a 7-day consistency race or a "most challenges completed this week" race) with a live tile per person.
7. **Cheer**: one-tap reactions ("🔥 Keep going", "💪 Proud of you") and short encouragement notes, with no open chat at first.

---

## 3. What can be shared — the data contract

### 3.1 Shareable items (opt-in, granular)

| Item key | Contents | Default |
|---|---|---|
| `activity` | Days active, sessions completed, current and best streak, programme day | **On** when you connect |
| `xp` | XP total, level, level name | **On** |
| `badges` | Earned badges and dates | **On** |
| `challenges` | Count of real-world challenges completed (not their text) | Off |
| `growth` | Change since baseline per skill (for example "+8 Assertiveness") — relative only | Off |
| `scores` | Current 0–100 skill scores | Off, extra confirmation required |
| `focus` | Today's focus skill and phase | Off |

### 3.2 Never shareable

Assessment answers and reflections, check-in answers and analyses, stories, scenario and lab answers or feedback, decision reasoning, journal, coach messages, AI connection, recovery data and email address (only the display name and an optional avatar initial).

### 3.3 How this is enforced

Friends never query raw tables. A **`share_snapshots`** row per user holds *only* the shareable fields, recomputed whenever progress changes (where `recomputeScores` and `awardAchievements` already run). Row Level Security on `share_snapshots` lets a viewer read a snapshot only through a security-definer function that:

1. checks an accepted friendship or a shared circle membership,
2. checks the owner's sharing grants for that audience,
3. returns only the granted columns (the others come back as `null`).

Raw tables keep their existing `user_id = app_current_user()` policies unchanged, so a bug in the social code cannot expose a journal entry.

---

## 4. Connections — how people find each other

### 4.1 Invite links

- `persona-90.vercel.app/i/<token>`: a 22-character random token (128-bit) stored hashed.
- The creator chooses a type: **friend invite** (single use or up to 10 uses) or **circle invite** (joins a specific circle).
- Invites expire after 7 days by default and can be revoked.
- Opening a link while signed out leads to sign-up, and the invite is applied after the account is created (a short-lived cookie carries the token).
- QR code generated in the browser (no service needed).

### 4.2 Friendship state machine

```
none ──invite accepted / request sent──▶ pending ──accept──▶ friends
                                   │                    │
                                   └──decline───▶ none  └──remove──▶ none
any state ──block──▶ blocked (one-directional; hides everything both ways)
```

- Stored as one row per pair with `user_low < user_high` (canonical order) to avoid duplicates, plus `requested_by` and `status`.
- Accepting an invite link counts as both sides agreeing (the inviter created the link, the invitee clicked it).

### 4.3 Discovery

No public search by email or name at first (prevents scraping and harassment). Connections come only from invite links and circle invites. A future option is "friend code" lookup (for example `P90-7KX2`) that the user can switch off.

---

## 5. Circles (groups)

| Property | Rule |
|---|---|
| Size | 2–30 members (small, accountable groups) |
| Roles | `owner` (one), `admin` (optional), `member` |
| Joining | Invite link, or added by a friend who is an admin (the person must accept) |
| Visibility | Private; members only |
| Sharing | Each member chooses what the circle sees (inherits friend defaults) |
| Moderation | Owner and admins remove members; anyone can leave; report sends to an app-level log |
| Limits | A user can create up to 5 circles and join up to 10 |

Circle features: a member grid (shared snapshot tiles), weekly summary, races, and a cheer feed.

---

## 6. Comparison and races

### 6.1 Compare view (friend vs. me, or a circle)

- **Effort first:** sessions this week, streak, challenges, XP gained this week.
- **Growth** (only if both share `growth`): side-by-side "change since start" bars per skill, never absolute scores unless both opted into `scores`.
- **Framing:** "You both trained *Assertiveness* 3 times this week", with no "you are worse than…" language.

### 6.2 Races (time-boxed challenges)

| Race type | Metric (from recorded activity only) | Typical length |
|---|---|---|
| Streak race | Consecutive days with a completed session | 7 days |
| Session sprint | Sessions completed | 7 days |
| Challenge hunt | Real-world challenges completed | 7 days |
| XP race | XP gained during the race window | 7 or 14 days |
| Team race | Circle split into 2 teams, summed effort | 7 days |

- Created by any circle member or between two friends; participants opt in.
- **Race tiles:** each participant's progress bar, rank, delta since yesterday and a "pace" indicator.
- Results are computed from the same activity tables as XP (`daily_sessions`, `daily_checkins`, labs), so they cannot be faked.
- Personal-best badges ("Beat your best week") reward everyone, not just first place.
- Anyone can choose "participate privately" (counted, name hidden as "A member").

### 6.3 Anti-cheating

All metrics derive from server-recorded events with timestamps; nothing is entered manually. A session counts only after the server-side completion checks (story read time, scenarios answered, reflection submitted) already in place.

---

## 7. Notifications (free)

| Channel | Cost | Use |
|---|---|---|
| In-app inbox and badge count | Free | Requests, cheers, race start and end |
| **Web Push** (VAPID keys generated by the app, the browser's own push service) | Free, no third party | "Rahul cheered you", "Race ends tomorrow", daily reminder |
| Calendar (.ics) | Free (already built) | Race end dates |

Web Push needs a service worker (already present) and a stored push subscription per device. Users opt in per type, with quiet hours.

---

## 8. Data model (PostgreSQL)

```sql
-- Who can see what
create table share_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  audience_type text not null check (audience_type in ('friends','circle')),
  audience_id uuid,                      -- circle id; null = all friends
  items text[] not null default '{activity,xp,badges}',
  hide_from_leaderboards boolean not null default false
);
create unique index share_settings_audience
  on share_settings (user_id, audience_type, coalesce(audience_id, '00000000-0000-0000-0000-000000000000'));

-- The only data friends can ever read
create table share_snapshots (
  user_id text primary key references "user"(id) on delete cascade,
  display_name text not null,
  programme_day smallint, phase smallint,
  sessions_completed int, days_active int, streak int, best_streak int,
  xp int, level smallint, level_name text,
  challenges_completed int,
  badges jsonb,                 -- [{code,title,earned_at}]
  growth jsonb,                 -- {dimension: delta}
  scores jsonb,                 -- {dimension: current}
  focus jsonb,                  -- {title, dimension}
  week_stats jsonb,             -- rolling 7-day counts for races and comparison
  updated_at timestamptz not null default now()
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by text not null references "user"(id) on delete cascade,
  kind text not null check (kind in ('friend','circle')),
  circle_id uuid references circles(id) on delete cascade,
  max_uses smallint not null default 1, uses smallint not null default 0,
  expires_at timestamptz not null, revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table friendships (
  user_low text not null references "user"(id) on delete cascade,
  user_high text not null references "user"(id) on delete cascade,
  status text not null check (status in ('pending','accepted','blocked')),
  requested_by text not null, blocked_by text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_low, user_high), check (user_low < user_high)
);

create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  emoji text, owner_id text not null references "user"(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table circle_members (
  circle_id uuid not null references circles(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table races (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles(id) on delete cascade,   -- null = 1:1 friend race
  created_by text not null references "user"(id) on delete cascade,
  kind text not null check (kind in ('streak','sessions','challenges','xp','team')),
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','cancelled')),
  check (ends_at > starts_at and ends_at - starts_at <= interval '30 days')
);

create table race_participants (
  race_id uuid not null references races(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  team smallint, private boolean not null default false,
  score int not null default 0, final_rank smallint,
  joined_at timestamptz not null default now(),
  primary key (race_id, user_id)
);

create table cheers (
  id uuid primary key default gen_random_uuid(),
  from_user text not null references "user"(id) on delete cascade,
  to_user text not null references "user"(id) on delete cascade,
  circle_id uuid references circles(id) on delete cascade,
  kind text not null check (kind in ('fire','strong','proud','clap','note')),
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(), seen_at timestamptz
);

create table notifications ( -- in-app inbox
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  type text not null, payload jsonb not null,
  created_at timestamptz not null default now(), read_at timestamptz
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null,
  types text[] not null default '{cheers,races,reminders}',
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter text not null references "user"(id) on delete cascade,
  target_user text, circle_id uuid, reason text not null, details text,
  created_at timestamptz not null default now()
);
```

### 8.1 Access rules (RLS)

| Table | Read | Write |
|---|---|---|
| `share_snapshots` | Owner directly; others **only** through `get_shared_snapshot(target)` (security definer: checks friendship or circle plus grants, masks columns) | Server only (recomputed) |
| `friendships` | Either party | Server routes (state machine enforced in SQL functions) |
| `circles`, `circle_members` | Members | Owner and admins (members update their own row: leave) |
| `races`, `race_participants` | Participants and circle members | Creator; participants join or leave themselves |
| `cheers` | Sender and recipient | Sender (only to friends or circle co-members; rate limited) |
| `invites` | Creator | Creator; redemption via a server function |
| `notifications`, `push_subscriptions` | Owner | Server and owner |

Blocking removes friendship, hides snapshots both ways, prevents cheers and invites, and removes the blocked person from 1:1 races.

---

## 9. Server and API design

| Route / action | Purpose |
|---|---|
| `POST /api/social/invites` | Create an invite (kind, circle, max uses, expiry) → returns URL and QR data |
| `GET /i/[token]` | Landing: shows inviter name and circle; sign-up or accept |
| `POST /api/social/invites/redeem` | Accept → friendship and/or circle membership |
| `POST /api/social/friends/:id` `accept / decline / remove / block` | State machine |
| `GET/PUT /api/social/sharing` | Read and update share settings |
| `GET /api/social/friends` | Friends with their visible snapshot tiles |
| `POST /api/social/circles` `…/members` `…/leave` | Circle management |
| `GET /api/social/circles/:id` | Circle board (snapshot grid, races, cheers) |
| `POST /api/social/races` `…/join` `…/leave` | Races |
| `POST /api/social/cheers` | Cheer (rate limited: 30 per day, 5 per person per day) |
| `GET /api/social/notifications` | Inbox |
| `POST /api/push/subscribe` | Web Push subscription |

**Snapshot refresh:** after `recomputeScores` and `awardAchievements` (already called after every activity) → `refreshShareSnapshot(userId)`. Races update scores in the same step for live races the user is in, so race tiles are always current without a scheduler.

**Race lifecycle without paid cron:** status moves to `live` or `finished` lazily on read (`now()` versus `starts_at` and `ends_at`), and final ranks are written the first time a finished race is opened. Optional: Vercel Cron (free on Hobby, daily) to send "race ends tomorrow" pushes.

---

## 10. UI

| Screen | Contents |
|---|---|
| **Friends tab** (new bottom-tab item, replacing "Coach", which moves into Practice) | Invite button, pending requests, friend tiles (avatar initial, level, streak 🔥, this week's sessions), quick cheer |
| **Friend profile** | Shared tiles only, compare button, start 1:1 race |
| **Compare** | Effort bars side by side; growth bars if both share; kind framing |
| **Circles** | List; create (name and emoji); circle board: member grid, active race tiles, weekly summary, cheer feed |
| **Race** | Live race tiles (progress bars, rank, pace), countdown, results with badges |
| **Sharing settings** | Per audience checklist with live preview ("This is what friends see") |
| **Inbox** | Requests, cheers, race events |

All screens are mobile-first and follow the current design system. Shared tiles always show a 👁 "shared by them" hint.

---

## 11. Abuse, safety and privacy

- Invite-only connections, no public profiles, no email exposure.
- Rate limits on invites (20 per day), cheers, circle creation and race creation.
- Block (immediate, silent) and report (stored for review).
- Short preset cheers; free-text notes limited to 140 characters, with an optional profanity filter list and AI moderation only when the user's own AI or the free model is available.
- Users can export and delete social data; account deletion cascades everywhere.
- "Pause social": one switch hides you from everyone without deleting connections.

---

## 12. Gamification additions

New badges: *First friend*, *Circle founder*, *Cheerleader* (25 cheers sent), *Race finisher*, *Personal best week*, *Team player* (won a team race). Social XP stays small (for example +5 per race finished, cheers give no XP) so the programme itself stays the main source of progress.

---

## 13. Rollout plan

| Phase | Deliverables | Effort |
|---|---|---|
| **1. Foundations** | Tables, RLS and functions; share settings; snapshots and refresh; invite links and QR; friendships (accept, remove, block); Friends tab with tiles | ~2–3 days |
| **2. Circles** | Create, join via invite, member grid, roles, leave and remove, circle sharing | ~2 days |
| **3. Compare and cheers** | Compare view, cheers and inbox, new badges | ~1–2 days |
| **4. Races** | Race types, live tiles, lazy lifecycle, results and badges, private participation | ~2–3 days |
| **5. Web Push** | VAPID keys, subscriptions, per-type preferences, quiet hours | ~1 day |

Each phase ships with migrations, unit tests for the SQL access functions (a friend can or cannot see each field), end-to-end tests with 2–3 users, and a live check.

---

## 14. Test plan (key cases)

1. A stranger (no friendship or circle) gets **nothing** from `get_shared_snapshot`.
2. A friend sees only granted items; ungranted columns are `null`.
3. A circle member sees the circle-level grant, which can differ from the friend grant.
4. Blocking hides both ways immediately; existing races remove the blocked user.
5. Invite reuse, expiry and revocation are enforced; tokens are stored hashed.
6. No route can return journal, check-in, story, lab or coach content to another user (static check plus tests).
7. Race scores equal the activity counts in the window; finished races freeze ranks.
8. Account deletion removes all social rows and snapshots.

---

## 15. Open decisions (defaults chosen; change any time)

| Decision | Default chosen |
|---|---|
| Default shared items | `activity`, `xp`, `badges` |
| Max circle size | 30 |
| Public leaderboard across all users | **No** (friends and circles only) |
| Open chat in circles | **No** for now (cheers and short notes only), to reduce moderation load |
| Score sharing | Opt-in with confirmation; never ranked |
