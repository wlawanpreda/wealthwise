---
name: update-firestore-schema
description: Co-evolve the Zod schema, Firestore security rules, TypeScript types, and seed data when adding or changing a persisted field. Use when the user asks to add a field to FinancialPlan or any persisted entity.
---

# update-firestore-schema

When persisted data changes, **four things must move together**:
1. Zod schema in [src/lib/schemas.ts](../../../src/lib/schemas.ts)
2. Server-side validation in [firestore.rules](../../../firestore.rules)
3. Sample data in [src/lib/defaults.ts](../../../src/lib/defaults.ts)
4. Migration handling for **existing user documents**

Skipping any of these creates silent bugs (schema mismatch, write rejected, missing data on read).

## When to use
- "Add a `currency` field to `BudgetAllocation`"
- "Track recurring transactions"
- "Store user preferences"
- Any field that ends up in `/users/{uid}/plan/current` in Firestore

## When NOT to use
- Adding ephemeral UI state (use Zustand)
- Adding derived/computed values (compute in `useDerivedFinancials` instead)

## Steps

### 1. Update the Zod schema
File: [src/lib/schemas.ts](../../../src/lib/schemas.ts)

```ts
export const BudgetAllocationSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(100),
  amount: z.number().nonnegative(),
  category: CSRCategoryEnum,
  // NEW field — make it optional with a default to handle old documents
  currency: z.enum(["THB", "USD"]).optional().default("THB"),
});
```

**Rule:** new fields must be `.optional()` or `.default()` — otherwise existing user documents fail validation on read and the app breaks for current users.

### 2. Update Firestore rules
File: [firestore.rules](../../../firestore.rules)

If the field is in a top-level `FinancialPlan`, add a size/type check in `isValidPlan`. Note: Firestore rules cannot iterate arrays, so per-element validation lives in app code (Zod).

```
function isValidPlan(data) {
  return data.keys().hasAll(['income', 'allocations', ...])
    && data.allocations is list && data.allocations.size() <= 50
    // size limit is the security guarantee — Zod handles shape
}
```

**Always set sensible array size limits.** They are the cheap defense against runaway documents.

### 3. Update the seed
File: [src/lib/defaults.ts](../../../src/lib/defaults.ts)

If users will see the new field on their first session, populate it in `buildSampleSeedPlan()`.

### 4. Migration / backfill plan

For **new optional fields with defaults**: nothing to migrate. Zod fills the default on read.

For **renamed fields**: write a one-time migration in a Server Action or Cloud Function. Read the old shape, write the new shape, delete the old key. Document the migration date in a code comment.

For **type changes** (e.g. `string` → `number`): add a version field if you anticipate more, otherwise write a `parseFlexible` that accepts both shapes during a transition window.

### 5. Update TypeScript types

If you defined any explicit interface separate from the Zod schema, delete it. Use `z.infer<typeof Schema>` everywhere — one source of truth.

```ts
export type BudgetAllocation = z.infer<typeof BudgetAllocationSchema>;
```

### 6. Update the UI
- New field input in the relevant feature
- Display the new field where appropriate
- Defensive read — for old documents, `field` will be the default value, never undefined (after Zod parse)

### 7. Test
- Add a test case in `tests/unit/schemas.test.ts` proving an old-shape doc still parses successfully
- Add a test for the new field's validation rules

### 8. Deploy rules separately from code
If the rules change is more permissive, deploy rules **before** code. If more restrictive, deploy code **before** rules.

```bash
firebase deploy --only firestore:rules --project epj-project
```

## Common mistakes
- ❌ Required new field → breaks every existing user
- ❌ Updating Zod but not rules → write rejected at Firestore boundary
- ❌ Updating rules but not Zod → Firestore accepts garbage that crashes the UI
- ❌ Renaming a field without writing a migration → data loss for existing users
- ❌ No size limit on array → user can DoS their own document past the 1MB limit
