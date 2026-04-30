---
name: add-feature
description: Scaffold a new feature folder under src/features/<name> following the project's feature-first structure. Use when the user asks to add a new tab, page, or self-contained UI capability.
---

# add-feature

Scaffolds a new feature in `src/features/<name>/` following project conventions.

## When to use
- User asks to add a new dashboard tab or page
- User asks to add a self-contained UI capability that owns its own state
- User says "add a feature for X" / "create a section for Y"

## When NOT to use
- Adding a single component to an existing feature → put it in that feature's `components/`
- Adding a shared utility → put it in `src/lib/`
- Adding a server-only mutation → use the `add-server-action` skill instead

## Steps

### 1. Create the folder structure
```bash
mkdir -p src/features/<name>/{components,lib,hooks}
```

### 2. Decide what state the feature owns
- **Reads from `useFinancialStore`** → no new store, just selectors
- **Owns ephemeral UI state** → local `useState` / `useReducer` is fine
- **Owns persisted data** → must be added to `FinancialPlan` schema in `src/lib/schemas.ts`

### 3. Create the entry component
Naming: `<name>-tab.tsx` (for tabs) or `<name>-panel.tsx` (for sub-views).

```tsx
// src/features/<name>/components/<name>-tab.tsx
"use client";

import { useFinancialStore, useDerivedFinancials } from "@/stores/financial-store";

export default function <Name>Tab() {
  // Use one selector per concern — never destructure the whole store
  const income = useFinancialStore((s) => s.income);
  const { totalWealth } = useDerivedFinancials();

  return <div>...</div>;
}
```

### 4. Pure logic in lib/
Any calculation or simulation that takes inputs → produces outputs goes in `src/features/<name>/lib/<file>.ts`.
Keep React out. This makes it unit-testable.

### 5. Wire into navigation
If user-facing tab, edit [src/features/dashboard/components/dashboard-shell.tsx](../../../src/features/dashboard/components/dashboard-shell.tsx):
- Add to `Tab` union type
- Add `NavButton` entries (sidebar + mobile bottom bar)
- Add `{activeTab === "<name>" && <Component />}` render branch

### 6. Add unit tests for lib/ functions
```ts
// tests/unit/<name>-logic.test.ts
import { describe, expect, it } from "vitest";
import { yourPureFunction } from "@/features/<name>/lib/your-file";

describe("yourPureFunction", () => {
  it("handles the happy path", () => { ... });
  it("handles empty input", () => { ... });
  it("does not divide by zero", () => { ... });
});
```

### 7. Verify
```bash
pnpm typecheck && pnpm lint && pnpm test
```

For UI: `pnpm dev` and click through the new tab in a browser.

## Cross-feature import rule
**Never** `import` from `src/features/<other>/` directly. If two features need shared logic, promote it to:
- `src/lib/` for pure utilities
- `src/components/ui/` for reusable UI (only if used in 3+ places)
- `src/server/actions/` for shared mutations

## Common mistakes
- ❌ Putting business logic in the React component (untestable)
- ❌ Importing from another feature folder
- ❌ Adding `"use client"` to a component that doesn't need it
- ❌ Forgetting to add the tab to both desktop sidebar and mobile bottom bar
