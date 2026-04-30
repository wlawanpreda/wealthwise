# Wealthwise — Financial Architect Terminal

ระบบวางแผนการเงินส่วนบุคคลตามหลัก **CSR 50/30/20** + **4-Pillar Health** + **AI Advisor (Gemini)** พร้อมการ sync ข้อมูลการลงทุนจากระบบภายนอก

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 22 LTS |
| Framework | Next.js 15 (App Router, RSC, Server Actions) |
| Language | TypeScript 5.7 (strict, `noUncheckedIndexedAccess`) |
| State | Zustand 5 |
| Styling | Tailwind 4 + Radix UI |
| Forms | React Hook Form + Zod |
| Validation | Zod (shared client/server schemas) |
| Auth | Firebase Auth (client) + Admin SDK session cookies (server) |
| DB | Firestore (multi-database) via Firebase Admin |
| AI | `@google/genai` (proxied via Server Route, key never exposed) |
| Charts | Recharts |
| Animation | Motion |
| Lint/Format | Biome 1.9 |
| Testing | Vitest + Playwright |
| Container | Docker (multi-stage, `node:22-alpine`, standalone output) |
| Deploy | Cloud Run + Cloud Build + Artifact Registry |

## Local Development

> **⚠️ Use pnpm only.** A `preinstall` guard blocks `npm install` / `yarn install` —
> running them aborts with an error. The Vite-era `package-lock.json` you may
> still see in the parent repo on `main` is from the old stack with known vulns;
> after this PR merges, only `pnpm-lock.yaml` is authoritative.

```bash
# Prereqs: Node 22.11+, Docker (optional)
corepack enable && corepack prepare pnpm@9.15.0 --activate

cp .env.example .env.local
# Fill in Firebase + Gemini values

pnpm install
pnpm dev
```

App runs at http://localhost:3000

### Run on Docker

```bash
pnpm docker:build
pnpm docker:run
```

หรือ
```bash
docker compose up --build
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Next dev server with Turbopack |
| `pnpm build` | Production build (standalone) |
| `pnpm start` | Run production server |
| `pnpm lint` | Biome check |
| `pnpm lint:fix` | Biome auto-fix |
| `pnpm typecheck` | TS strict typecheck |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright e2e |

## Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── (root)/page.tsx       # Dashboard (RSC, fetches plan server-side)
│   ├── login/page.tsx        # Public login
│   ├── api/
│   │   ├── auth/session/     # Session cookie management
│   │   ├── chat/             # Gemini streaming proxy (key hidden)
│   │   └── health/           # Cloud Run health check
│   ├── layout.tsx
│   └── globals.css
├── middleware.ts             # Route guard (redirect if no session)
├── features/                 # Feature-first organization
│   ├── auth/
│   ├── overview/
│   ├── planning/
│   ├── distribution/
│   ├── trends/
│   ├── chatbot/
│   └── dashboard/
├── components/ui/            # Radix-based primitives
├── lib/
│   ├── schemas.ts            # Zod schemas (single source of truth)
│   ├── financial-logic.ts    # Domain calculations (pure)
│   ├── firebase/
│   │   ├── client.ts         # Web SDK (browser only)
│   │   ├── admin.ts          # Admin SDK (server only)
│   │   └── plan-repository.ts
│   ├── auth/session.ts       # Session cookie creation/verification
│   ├── env.ts                # Server env validation (Zod)
│   ├── env.client.ts         # Public env validation
│   └── utils.ts
├── server/
│   └── actions/              # Server Actions
│       ├── plan.ts           # Plan CRUD
│       ├── auth.ts           # Sign in/out
│       └── external-sync.ts  # Cross-DB aggregation
└── stores/
    └── financial-store.ts    # Zustand + selectors
tests/unit/                   # Vitest specs
firestore.rules               # Security rules
Dockerfile                    # Multi-stage production image
cloudbuild.yaml               # CI/CD pipeline
.github/workflows/            # GitHub Actions
```

### Security boundaries

- **Public env** (`NEXT_PUBLIC_*`) is validated by Zod and may appear in client bundle.
- **Server env** (Gemini key, Admin SDK service account) is `server-only` — never exposed.
- **Session cookies** are HTTP-only, signed by Firebase Admin SDK, verified on every request via middleware.
- **Firestore rules** enforce `isOwner(userId) && verified()` and validate plan shape (size limits).
- **External database reads** happen server-side via Admin SDK with explicit allow-list.

## Data Model

```ts
FinancialPlan {
  income: number
  savingsTarget: number          // default 2,880,000
  allocations: BudgetAllocation[]  // CSR Constant/Spending/Reserve
  liabilities: Liability[]
  emergencyFunds: FinancialAccount[]
  history: FinancialSnapshot[]   // monthly wealth snapshots
  projections: IncomeProjection[]
}
```

Stored at `/users/{uid}/plan/current` in Firestore (multi-DB ID from env).

## Deploying to Cloud Run

ดู [DEPLOY.md](./DEPLOY.md)

## Critical Bug Fixes (vs original)

1. **Gemini API key leak** → moved to `/api/chat` route (server-only)
2. **Firebase Admin** added for cross-DB reads (no client cross-tenant access)
3. **Firestore listener throwing in callback** → returns null + warns instead
4. **`wealthStatus` ternary order bug** → Critical now reachable
5. **Wrong Gemini model name** → `gemini-2.5-flash`
6. **`window.prompt` for transactions** → proper Dialog component
7. **`setInterval(100ms)` polling** → Radix Popover (proper positioning)
8. **JSON.stringify diff false-positives** → field-by-field serialization
9. **Strict TypeScript** + Zod validation at every boundary
10. **Dead code** (chevron components, unused imports) removed

## License

Apache-2.0
