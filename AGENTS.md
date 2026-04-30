# Wealthwise — Agent Rules

> Universal rules for AI coding agents (Claude Code, Antigravity, Cursor, Copilot, Aider, etc.).
> This is the **single source of truth** — `.claude/CLAUDE.md` and `.antigravity/*.md` reference this file.

## TL;DR for agents

You are working on a **Next.js 15 / Cloud Run** app for personal finance planning. **Type safety, security boundaries, and cost discipline matter more than feature velocity here.**

Before writing code:
1. Check the corresponding **Zod schema** in [src/lib/schemas.ts](src/lib/schemas.ts) — it is the source of truth for all data shapes
2. Decide if your change runs **client / server / both** — the boundary is enforced (do not break it)
3. If touching money/auth/Firestore, **read this whole file**

After writing code, **always run** before reporting done:
```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Stack invariants (do not change without discussion)

- **Node.js 22 LTS**, **pnpm 9** (lockfile committed) — never use npm/yarn
- **Next.js 15 App Router** with `output: "standalone"` for Cloud Run
- **TypeScript 5.7 strict** with `noUncheckedIndexedAccess` — must handle `T | undefined` from index access
- **Tailwind 4** + **Radix UI** + **shadcn-style primitives** in [src/components/ui/](src/components/ui/)
- **Zustand 5** for client state, **Server Actions** for mutations, **Route Handlers** only for streaming
- **Zod** validates at every trust boundary — never trust unvalidated `unknown`
- **Biome** for lint/format — never reach for ESLint/Prettier configs

---

## Architecture rules

### Folder layout (feature-first)
```
src/
├── app/                    # Next.js routes (RSC + Route Handlers)
├── features/<name>/        # Self-contained feature folders
│   ├── components/         # React components (mostly "use client")
│   ├── hooks/              # Local hooks
│   ├── lib/                # Pure functions (testable)
│   └── actions.ts          # Feature-local Server Actions (optional)
├── components/ui/          # Shared Radix-based primitives
├── components/layout/      # Shared layout pieces
├── lib/                    # Cross-feature libs (schemas, env, firebase, utils)
├── server/actions/         # Cross-feature Server Actions
├── stores/                 # Zustand stores
└── middleware.ts           # Route guard
```

**Rules:**
- Cross-feature imports go through `lib/` or `server/actions/` — never `import` from another feature folder
- Components live with the feature that owns them — only promote to `components/ui/` when reused 3+ times
- Pure logic (calculations, simulations) lives in `lib/` — keep React out of these files so tests stay simple

### Client / server boundary

| Concern | Where it runs | Marker |
|---|---|---|
| UI / interactivity | Client | `"use client"` at top of file |
| RSC fetching | Server | Default in `app/` |
| Mutations (forms, button actions) | Server | `"use server"` at top of file |
| Streaming (chat, large responses) | Route Handler | `app/api/<route>/route.ts` |
| Firebase Web SDK | Client only | `src/lib/firebase/client.ts` |
| Firebase Admin SDK | Server only | `src/lib/firebase/admin.ts` |
| `getServerEnv()` (secrets) | Server only | `src/lib/env.ts` (`server-only` import) |

**Never:**
- Import `firebase-admin` or `@/lib/env` into a client component
- Inline a secret into `process.env.NEXT_PUBLIC_*`
- Bypass `requireSessionUser()` in a server action / route handler that touches user data
- Use `revalidatePath` inside the per-keystroke `savePlan` flow — it thrashes the RSC cache

### Auth & sessions

- Sign-in: client gets Firebase ID token via popup → POST to `/api/auth/session` → server creates HTTP-only session cookie via Admin SDK
- Verification: `requireSessionUser()` is wrapped in React `cache()` — calling it N times in one request hits Firebase once
- Edge middleware ([src/middleware.ts](src/middleware.ts)) only checks **cookie presence** (Edge can't run firebase-admin) — actual verification happens in route handlers / server actions
- API routes (`/api/*`) are **excluded from middleware redirect** — they handle their own auth and return 401, never 307

### Firestore rules

- Schema validation lives in [firestore.rules](firestore.rules) **and** [src/lib/schemas.ts](src/lib/schemas.ts) — when changing a field, update **both**
- Server-side writes always go through `FinancialPlanSchema.parse()` first
- Multi-database: the user's plan lives in `NEXT_PUBLIC_FIREBASE_DATABASE_ID`; cross-tenant reads (retire-tax / retire-5%) are **server-side only** through Admin SDK

---

## Coding conventions

### TypeScript
- `strict: true` + `noUncheckedIndexedAccess: true` — `array[i]` returns `T | undefined`, handle it
- No `any`, no `as` type assertion to bypass the checker — use Zod or a proper guard
- No non-null assertion (`!`) — Biome blocks it. Use early-return or `?? fallback`
- Prefer `for...of` over `.forEach()` (Biome rule)

### React
- Default to **Server Components**. Add `"use client"` only when you need state, effects, or browser APIs
- One Zustand selector per concern: `useFinancialStore((s) => s.income)` — do not destructure the whole store
- Heavy derivations go in pure functions in `lib/` and are called from selectors or `useMemo`
- Forms: **React Hook Form + Zod** via `@hookform/resolvers/zod` — never `window.prompt` / `alert`
- Floating UI: **Radix Popover/Dialog** — never custom positioning + `setInterval`
- Effects with timers: store the timer in a `ref` and clear it on every set, not just on unmount

### Styling
- Tailwind utility classes — no inline styles except for dynamic colors (recharts gradients)
- Custom design tokens are in `@theme` block in [src/app/globals.css](src/app/globals.css) — extend there, not in `tailwind.config`
- Use `cn()` from `@/lib/utils` for conditional classes (clsx + tailwind-merge)

### Money & numbers
- Money values are `number` in THB (no decimals — Thai baht; rounding handled by `Intl.NumberFormat`)
- Always `safeDivide(num, denom)` — never `a / b` directly when `b` could be 0 (DTI, ratios, etc.)
- `clamp(value, min, max)` for bounded UI values (progress bars, scores)

### Comments
- **Default to no comments.** Names should explain *what*. Comments only for *why* — non-obvious constraints, hidden invariants, regression context
- Bad: `// loop through allocations` — Good: `// Wealth status order: Critical first — original code returned Warning before Critical was checked`

---

## Critical bugs that have already been fixed (regression watch)

Do not re-introduce these. There are tests in [tests/unit/](tests/unit/) guarding several of them.

| Bug | Where | Test |
|---|---|---|
| Gemini API key in client bundle | now in `/api/chat` route handler | manual |
| `wealthStatus` ternary order — Critical was unreachable | [financial-logic.ts:76](src/lib/financial-logic.ts:76) | [financial-logic.test.ts](tests/unit/financial-logic.test.ts) |
| `window.prompt` for transactions | replaced with `<TransactionDialog>` | manual |
| `setInterval(100ms)` polling for popup positioning | replaced with Radix Popover | manual |
| `revalidatePath` on every keystroke save | removed from [server/actions/plan.ts](src/server/actions/plan.ts) | manual |
| Middleware redirected POST→GET on `/api/*` | API routes excluded from middleware | manual |
| Undo timer not cleared on retrigger | `undoTimerRef` clears on each set in [distribution-tab.tsx](src/features/distribution/components/distribution-tab.tsx) | manual |
| Wrong Gemini model name (`gemini-3-flash-preview`) | now `gemini-2.5-flash` via `GEMINI_MODEL` env | manual |

---

## Workflow checklists

### Adding a new feature
1. `mkdir -p src/features/<name>/{components,lib,hooks}`
2. Write Zod schema in `src/lib/schemas.ts` if introducing new persisted data
3. Update [firestore.rules](firestore.rules) shape validation if persistent
4. If user-facing data flow: extend `FinancialPlan` schema + `firestore.rules` size limits + migration in `defaults.ts` if needed
5. Add unit tests for any pure logic in `lib/`
6. Wire into `<DashboardShell>` tab if user-facing
7. Run the verify command before reporting done

### Adding a Server Action
1. Add `"use server"` at top of file
2. Validate inputs with Zod (`safeParse`, return `{ ok: false, error }` on failure)
3. Call `await requireSessionUser()` for any user-scoped action
4. For mutations affecting Firestore: parse with `FinancialPlanSchema.parse()` before write
5. Do **not** call `revalidatePath` for high-frequency actions (debounced auto-save)

### Adding a Route Handler
1. `app/api/<name>/route.ts`
2. `export const runtime = "nodejs"` (Edge can't run firebase-admin)
3. Verify session: `await requireSessionUser()` (catch + 401)
4. Validate body with Zod
5. Set `Cache-Control: no-store` on responses with PII

### Verify command (run before reporting done)
```bash
pnpm typecheck && pnpm lint && pnpm test
```

For UI changes also run `pnpm dev` and exercise the feature in a browser.

For Cloud Run / Docker changes:
```bash
docker build -t wealthwise:test --build-arg <required NEXT_PUBLIC_*> .
```

---

## Cost & performance discipline

- Cloud Run scales to zero by default — first request after idle ~2-3s cold start. Don't add eager imports of heavy libs in `app/layout.tsx`
- Firestore reads cost money. **Never poll** — use `onSnapshot` (client) or `cache()` (server)
- Gemini calls cost money. **Always** rate limit / debounce client requests. Today there is no rate limiter — adding one is a high-priority follow-up
- Recharts is large. Only import the chart subcomponents you need — never `import * as Recharts`

---

## What never to do

- ❌ Commit `.env.local`, `firebase-admin-key.json`, or any other secret
- ❌ Skip `pnpm-lock.yaml` updates — Cloud Build uses `--frozen-lockfile`
- ❌ Use `git commit --no-verify` (or any pre-commit hook bypass) without explicit user consent
- ❌ Add `revalidatePath` inside high-frequency Server Actions
- ❌ Import `firebase-admin` from a `"use client"` file
- ❌ Use `window.alert` / `window.prompt` / `window.confirm` for any user flow
- ❌ Disable Biome rules with `// biome-ignore` without an inline reason
- ❌ Reach for new dependencies before checking what's already installed

---

## Pointers

- Architecture overview: [README.md](README.md)
- Cloud Run deployment runbook: [DEPLOY.md](DEPLOY.md)
- Schema source of truth: [src/lib/schemas.ts](src/lib/schemas.ts)
- Domain calculations: [src/lib/financial-logic.ts](src/lib/financial-logic.ts)
- Auth flow: [src/lib/auth/session.ts](src/lib/auth/session.ts)
