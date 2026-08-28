# CLAUDE.md

Project guide for AI agents working on **Feedlens.ai** (package `feedlens`, repo dir `promptfeed`).

---

## Product

**One-liner**: A discovery feed that pairs AI-generated images & videos with the prompts that produced them.

**The problem**: When you scroll AI content on X / Reddit / Instagram / YouTube / TikTok, the prompt is buried — in a comment, a screenshot, a thread, or nowhere at all. You see the output and have to dig (or guess) to learn how it was made.

**The product**: A masonry feed of curated AI media where the **prompt sits next to the image, in the same card**, no detail-page click required. Users discover, **copy**, and **remix** prompts; creators get attribution; models and platforms get faceted browsing.

**Tagline (canonical, used in metadata)**:
> "Discover the prompts behind the AI images you see on social — curated from GPT Image, Midjourney, Nano Banana, Flux, Sora, and more. Copy, remix, share."

### Experience pillars
1. **Prompt is the hero.** It's the most prominent text on every card. Model, platform, and source-user metadata sit at lower contrast.
2. **No detail click for the basics.** A user grasps "what was made" + "how it was made" in one glance. The detail modal is a deep-dive, not a requirement.
3. **Personalization via interactions.** Like (heart) and Save-to-folder (bookmark) build a personal library. Sidebar surfaces these as first-class views (Discover / Liked / Saved).
4. **Curation > raw scrape.** A scraper ingests, but admins can promote/edit/hide. Models and platforms are a controlled taxonomy with counter-cached `post_count`.
5. **Anonymous-first browsing, sign-in to act.** Discover works without auth. Like / Save / open Liked or Saved view triggers the in-place `<SignInModal>` and replays the action after sign-in.

### Primary user flows

| Flow | Path |
|---|---|
| Browse Discover | `/` — masonry feed, infinite scroll, model/platform/sort filters in URL |
| Filter by model or platform | `/?model=midjourney`, `/?platform=x` (sidebar items toggle) |
| Sort | `?sort=newest|oldest|top|viewed` |
| Search prompts | `?q=…` (server-side full-text via `listPostsPaged`) |
| Open a prompt | Click card → `<PostDetailModal>` (zoom-from-card animation) or canonical `/prompt/[id]` |
| Like | Heart on card / modal — toggles `post_likes`, idempotent (insert ignores `23505`) |
| Save | Bookmark on card / modal — opens `<SaveDialog>`, picks a folder (or creates one), inserts `post_saves` |
| Liked view | `/?view=liked` — newest-liked first, instant unlike removal |
| Saved view | `/?view=saved` — folder grid; click into folder → posts |
| My Prompts | `/my-prompts` — prompts the user uploaded (separate flow from saves) |
| Sign in | `<SignInModal>` (email/password or Google Identity) — modal-mounted, stays on page |
| Admin | `/admin` — taxonomy + post moderation, gated by `profiles.is_admin` |
| Report a post | `/api/report` from card menu |

### Visual language
- Neutral palette (black/white/gray). No accent applied to media — AI imagery is the color.
- System font stack. Border radius 10px (cards), 6px (buttons).
- Top route progress bar (3px, gradient + animated shimmer, no shadow) signals navigation work.
- Toast feedback via `sonner` (e.g. "Saved to Inspiration" with an inline "Change" action).

### Data model intuition
A `post` is the atomic unit: media URL + prompt + model + platform + scraped/posted timestamps + counters. Users layer `post_likes` and `post_saves` on top, where `post_saves` belongs to a `save_folder`. `profiles` extend `auth.users` with display fields and admin/banned flags. Counter triggers keep `models.post_count` and `platforms.post_count` cheap to read.

---

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript strict** (`noUncheckedIndexedAccess`)
- **Tailwind 3** + **Radix UI** primitives + **lucide-react** + **sonner**
- **Supabase** (Postgres + Storage + Auth) via `@supabase/ssr` (cookie sessions)
- **pnpm** for package management
- **Upstash Redis** (REST) for rate limiting (no-op in dev when env missing)
- Path alias `@/*` → `./src/*`

```bash
pnpm dev          # next dev
pnpm build        # next build
pnpm lint         # next lint
pnpm types:gen    # supabase gen types typescript → src/types/database.ts
pnpm exec tsc --noEmit   # quick typecheck
```

## Layout

```
src/
  app/
    (main)/         # public site: layout, home (/), my-prompts, prompt/[id]
    (auth)/         # login, register, forgot-password, reset-password
    admin/          # admin panel (gated by profiles.is_admin)
    api/            # likes, saves, saved, liked, posts, views, report, admin/*
    auth/callback   # supabase OAuth callback + signout
    sitemap.ts robots.ts globals.css layout.tsx
  components/
    providers/      # InteractionsProvider, FeedFilterProvider, RouteProgressProvider
    features/       # feed, sidebar, topbar, save-folders, profile, settings, auth, ...
    ui/             # primitives (logo-mark, lazy-image, brand-square, user-avatar)
  lib/
    supabase/       # browser, server, admin (service role), auth helpers
    posts.ts        # listPostsPaged + cursor codec + getOwnerProfiles
    folders.ts      # server queries: getUserFoldersAndSaves, listSavedPostsInFolder
    folders-client.ts # browser RPC: createFolder, deleteFolder, ...
    interactions.ts # getLikedPostIds, listLikedPosts, listSavedPosts
    rate-limit.ts   # Upstash fixed-window
    safe-url.ts     # SSRF guard for image hosts at insert time
    avatar.ts + avatar-parts/  # react-nice-avatar SVG primitives
    site.ts         # SITE_URL, DEFAULT_DESCRIPTION, safeRedirect, canonicalQuery
  hooks/            # use-grid-size, use-local-flag
  middleware.ts     # supabase session refresh on every non-static request
  types/database.ts # generated by `pnpm types:gen`
  types/domain.ts   # re-exports + UI-only types (SaveFolderSummary, AvatarConfig, PostSort)
supabase/
  migrations/       # 0001..NNNN incremental SQL — never edit applied ones
  seed/             # tsx-runnable seed
prompt.md           # original product brief
```

## Database

All tables RLS-enabled (see migrations 0001/0002).

| Table | Purpose | Key indexes |
|---|---|---|
| `posts` | scraped/curated AI media + prompt | `posts_created_at_idx`, `idx_posts_views_desc`, `idx_posts_model`, `idx_posts_platform`, `posts_media_type_likes_created_at_idx` |
| `post_likes (user_id, post_id) PK` | likes | `idx_post_likes_user (user_id, created_at DESC)` — used for `/api/liked` |
| `post_saves (user_id, post_id) PK` | saves into folders | `idx_post_saves_user`, `post_saves_folder_idx` |
| `save_folders` | per-user folders, exactly one default | partial unique idx on `is_default WHERE is_default`, unique `(user_id, lower(name))` |
| `profiles` | profile, `is_admin`, `is_banned`, `is_verified` | client cannot set `is_admin` (migration 0003) |
| `models`, `platforms` | taxonomy with `post_count` (counter triggers, migration 0004) | |
| `post_views` | organic per-viewer dedupe (migration 0009) | `record_post_view` RPC |
| `follows`, `notifications`, `reports`, `social_accounts` | aux | |

**RPCs** (`Database["public"]["Functions"]`): `create_save_folder`, `set_default_save_folder`, `record_post_view`, `increment_post_views`, `is_admin`.

**Cascade matrix** (verified — assume nothing, check `pg_constraint` before relying on it):
- `post_likes → posts` ON DELETE CASCADE
- `post_likes → auth.users` ON DELETE CASCADE
- `post_saves → save_folders` ON DELETE CASCADE *(deleting a folder drops its saves; likes are NOT touched)*
- `post_saves → posts` ON DELETE CASCADE
- `save_folders → auth.users` ON DELETE CASCADE
- `save_folders` has **no** non-deletable invariant — default folders can be deleted; UI must allow it.

**Migrations**: append `NNNN_short_name.sql`. Apply via Supabase MCP `apply_migration` (remote) or Supabase CLI (local). Never edit a migration that's already been applied.

## Conventions

### Code style
- Strict TS, no `any`. Use `unknown` at boundaries, narrow safely.
- Many small files; aim ~200–400 lines, hard cap ~800.
- Functions <50 lines. Immutable updates via spread; no in-place mutation.
- Components: named `interface`/`type` for props, no `React.FC`.
- Prefer string literal unions over `enum` (e.g. `PostSort`, `MediaType`, `PlatformSlug`).
- No `console.log` in shipped code; surface user errors via `toast`.
- Server-only modules import `"server-only"` (e.g. `rate-limit.ts`).

### API endpoints
All under `src/app/api/`, follow this envelope:
```ts
{ success: true, data: T, error: null }
{ success: false, data: null, error: "code" }   // never leak stack traces
```

Pattern (`/api/likes` is the canonical example):
1. `getCurrentUser()` → 401 if missing
2. `rateLimit({ bucket: "api:foo", limit, windowSec, identifier: user.id })` → 429
3. Validate `await request.json()` with explicit guards (no Zod yet — manual parsers like `parseBody`)
4. Validate UUIDs with the local regex (`UUID_RE`)
5. Idempotent inserts: ignore Postgres `23505` (unique violation)
6. Return JSON envelope

### Pagination
Keyset cursors, base64-encoded JSON `{ createdAt, postId }` (or feed-equivalent). See `listLikedPosts` (`src/lib/interactions.ts`) and `listPostsPaged` (`src/lib/posts.ts`).

### URL filters vs Next.js navigation
The `FeedFilterProvider` writes URL state via **`history.replaceState`** so Next.js doesn't re-render the route on every filter change. **Side effect**: `useSearchParams` does NOT update. If you `router.push("/?view=liked")`, the provider's local state will NOT sync — for cross-view nav from outside the provider tree (e.g. after sign-in), use `window.location.href = href` for a full reload.

### Auth & global state

Three providers wrap the (main) layout:

**`InteractionsProvider`** — owns:
- `liked: Set<string>`, `saved: Set<string>` (ids only — fast O(1) checks on every card)
- `folders`, `defaultFolderId`, `saveByPostId`, `lastFolderId` (from `localStorage` key `pf:last-folder-id`)
- `toggleLike`, `toggleSave`, `requestSave`, `addFolder`, `saveToFolder`, `movePostToFolder`, `setDefaultFolderClient`, `removeFolderFromState`, `renameFolderInState`, `requestSignInForNav`
- A globally-mounted `<SignInModal>` and a `pendingAuthAction` queue so anonymous users can attempt `like` / `save` / `navigate` and have it replay after sign-in.

**`FeedFilterProvider`** — `view + model + platform + sort + folder + q`, URL-mirrored.

**`RouteProgressProvider`** — top loading bar (`pf-progress-bar` CSS class with shimmer keyframes in `globals.css`).

### Sign-in flow gotchas
- `SignInModal` calls `signInWithPassword` → `onSignedIn()` (closes modal) → `router.refresh()`. Middleware-refreshed cookies cause the layout to re-render with the new `userId`, which the `InteractionsProvider` picks up via `prevUserIdRef` and drains the `pendingAuthAction` queue.
- Pending action `kind: "navigate"` uses `window.location.href` (full reload) — intentional, see "URL filters" above.

### Data layer staleness
`InteractionsProvider` keeps a `foldersRef` mirror to read the latest folders synchronously inside callbacks. Background: when a callback chains `addFolder` then `saveToFolder` in the same tick, React hasn't flushed `setFolders`, so `useCallback`-captured `folders` is stale and `folders.find()` returns `undefined`. Pattern: `useRef(folders)` + `useEffect` to keep current; read `foldersRef.current` inside callbacks where freshness matters.

### `lastFolderId` semantics
- Written on every successful save, on `addFolder(makeDefault=true)`, and on `setDefaultFolderClient`.
- Read by `save-folder-modals-host.tsx:saveDialogInitialFolderId` to pre-select the folder in `<SaveDialog>`.
- Falls back to current default, then `folders[0]`.

### Counts in sidebar
The sidebar reads `liked.size` / `saved.size` from `useInteractions()` directly — props are SSR fallbacks for anonymous users only. Don't replace this with prop-only counts; it's required for instant updates after toggling.

### Empty state vs skeleton
For Liked/Saved fetched lists, distinguish `data === null` (loading → skeleton) from `data.posts.length === 0` (truly empty → empty state). Pattern lives in `home-content.tsx` (`<FeedSkeletonGrid>`).

### End-of-feed footer
`<FeedGrid showEndOfFeed={false}>` for Liked, Saved folder-detail, and any "scoped" feed. Default `true` only for the public Discover feed.

### Custom dialogs over native
**Never** use `window.confirm` / `window.alert` / `window.prompt`. Build a Radix-based or inline custom dialog (see `DeleteFolderDialog` and `RenameDialog` in `saved-folders-grid.tsx`).

## Security

- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) is **only** used in `src/lib/supabase/admin.ts` — server-only, never imported from client modules.
- CSP, HSTS, frame-ancestors, Permissions-Policy are set in `next.config.mjs`. Image hosts allow any `https:` host but `safe-url.ts` rejects private/loopback IPs at insert time (SSRF guard).
- `profiles.is_admin` cannot be set from client-side updates (migration 0003).
- Admin endpoints (`/api/admin/*`) gate on `checkIsAdmin(user.id)` server-side.
- Always validate user-supplied UUIDs and string lengths at the API boundary.
- Banned users see `<BannedScreen>` overlay (layout-level guard).
- `safeRedirect` / `isAllowedRedirect` (`src/lib/site.ts`) protect against open-redirect on any user-supplied `next=` parameter.

## Git workflow

- **Branch**: `main` is the only long-lived branch; pushes deploy to production.
- **Commits**: Conventional Commits — `feat:`, `fix:`, `chore:`, `perf:`, `style:`, `refactor:`. Subject ≤72 chars, optional body for *why*. Scoped: `feat(liked):`, `fix(saves):`.
- Active GitHub account for pushing: `ahmetcantiryaki` (use `gh auth switch` if `gh auth status` shows another active user).
- Use HEREDOC for multi-line commit messages.
- Don't amend pushed commits without an explicit ask.

## Common tasks (recipes)

### Add a new feed-like view (e.g. Liked)
1. **Server query** in `src/lib/interactions.ts` (or new file): keyset paginator returning `{ posts, nextCursor }`.
2. **API route** at `src/app/api/<view>/route.ts` mirroring `/api/liked` (auth + rate-limit + cursor codec).
3. **Filter view** in `feed-filter-provider.tsx`: extend `FeedView` union, parse/build URL, switch rules.
4. **Page server fetch** in `src/app/(main)/page.tsx`: pre-fetch when the URL contains the view; pass to `<HomeContent initial<View>=…>`.
5. **HomeContent state**: add `<View>` state, fetch effect on `state.view` change, infinite-scroll loader, render branch in `ContentBody`.
6. **Sidebar entry** in `sidebar.tsx`: add to `MAIN_NAV` with `authOnly: true` if needed; live count via `useInteractions()`.
7. **Anonymous gating**: `gateAuth={!isAuthed && authOnly}`; on click call `requestSignInForNav(href)` from `useInteractions()`.

### Add a new schema column
1. New migration `supabase/migrations/NNNN_add_X.sql` with both DDL and (if needed) backfill.
2. Apply via Supabase MCP `apply_migration` or CLI.
3. `pnpm types:gen` regenerates `src/types/database.ts`.
4. Surface domain types in `src/types/domain.ts` if used in component props.

### Investigate before destructive changes
Use Supabase MCP `execute_sql` to check live state: indexes (`pg_indexes`), constraints (`pg_constraint`), triggers (`information_schema.triggers`). Many decisions in this repo (e.g. "default folder can be deleted") are unblocked only after confirming the DB has no enforcing constraint.

## Don'ts

- Don't run destructive git ops (`reset --hard`, `push --force`) without explicit ask.
- Don't bypass hooks (`--no-verify`).
- Don't add Zod or other deps without checking `package.json` first — current code uses manual validators.
- Don't introduce `enum` — use string literal unions.
- Don't write `console.log` in shipped code.
- Don't use `window.confirm` / browser native dialogs.
- Don't expose service role key to client modules.
- Don't edit applied migrations; always append a new one.
- Don't `router.push` between filter views from outside the FeedFilterProvider tree — full reload via `window.location.href`.
- Don't add the End-of-Feed footer to scoped lists (Liked, Saved folder detail).
- Don't fight the "prompt is the hero" hierarchy — meta should never out-shout the prompt body.
