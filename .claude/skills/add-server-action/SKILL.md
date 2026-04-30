---
name: add-server-action
description: Add a Next.js Server Action with auth, Zod validation, and Firestore Admin SDK access. Use when the user asks to add a mutation that touches user data, Firestore, or external services.
---

# add-server-action

Pattern for Server Actions in this project. Enforces auth, validation, and the cost-discipline rule (no `revalidatePath` in high-frequency actions).

## When to use
- User asks for a form submission handler
- User asks to read/write Firestore from a button click
- User asks to call an external API (Gemini, retire-tax, retire-5%)
- User asks to add a "save" / "create" / "delete" operation

## When NOT to use
- The handler must **stream** a response → use a Route Handler (`app/api/<name>/route.ts`) instead
- The mutation is purely client-side state → use Zustand action in [src/stores/financial-store.ts](../../../src/stores/financial-store.ts)

## Pattern

### 1. Pick the right home
- **Cross-feature** → `src/server/actions/<domain>.ts`
- **Single-feature** → `src/features/<name>/actions.ts`

### 2. Skeleton

```ts
"use server";

import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
// import { getAdminDb } from "@/lib/firebase/admin"; // when touching Firestore
// import { getServerEnv } from "@/lib/env";          // when needing secrets

const inputSchema = z.object({
  // describe inputs precisely; reject anything unexpected
});

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function doThing(rawInput: unknown): Promise<Result<{ ... }>> {
  // 1. Auth gate — for any user-scoped action
  const user = await requireSessionUser();
  if (!user.emailVerified) {
    return { ok: false, error: "Email not verified" };
  }

  // 2. Validate input (never trust)
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  // 3. Business logic
  // ...

  return { ok: true, data: ... };
}
```

### 3. Decide on revalidation

**Default: do NOT call `revalidatePath`.** It thrashes the RSC cache when called from per-keystroke actions like `savePlan`.

Call `revalidatePath(...)` only if:
- The action causes server-rendered content above the action point to become stale, AND
- The action is triggered explicitly by the user (button click), AND
- It runs at most a few times per session

Example: `resetPlan()` (user clicks "reset") → call `revalidatePath`. `savePlan()` (debounced auto-save) → do not.

### 4. Decide on rate limiting

External API calls (Gemini, etc.) need rate limiting. Today no limiter exists — flag this to the user before adding new external call sites.

### 5. Update the caller

Client-side caller pattern:
```tsx
"use client";
import { doThing } from "@/server/actions/<domain>";

const result = await doThing(input);
if (!result.ok) {
  // surface error to user via Dialog/toast — never alert()
  return;
}
// use result.data
```

### 6. Add a test if logic is non-trivial
Server Actions can be unit-tested by extracting the business logic to a pure function in `lib/` and testing that. The action becomes a thin adapter (auth + validate + delegate).

### 7. Verify
```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Common mistakes
- ❌ Skipping `requireSessionUser()` — every user-scoped action must auth
- ❌ Using `as` to type-assert input shape instead of Zod parse
- ❌ Adding `revalidatePath` "just to be safe" — it's not safe, it's expensive
- ❌ Throwing instead of returning `{ ok: false }` — Server Actions throw causes a generic error UI
- ❌ Importing from a `"use client"` file — keeps the bundle separation honest
