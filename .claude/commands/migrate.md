---
description: Preview a Firestore schema change against existing user documents. Use before changing src/lib/schemas.ts or firestore.rules.
---

Walk the user through a safe Firestore schema change. The goal is to **not break existing user documents**.

Steps:

1. **Identify the change** — ask the user (if not stated):
   - What field is being added / renamed / removed / type-changed?
   - Is it required or optional?

2. **Classify the migration risk**:
   - 🟢 **Low**: Add an optional field with a default → no migration needed
   - 🟡 **Medium**: Add a required field → must backfill existing docs OR make optional with default
   - 🔴 **High**: Rename or change type of an existing field → must write migration code

3. **For low-risk changes**, follow the `update-firestore-schema` skill — update Zod, rules, defaults, and tests.

4. **For medium/high-risk changes**, propose a migration plan:
   - Two-phase deploy: (a) deploy code that accepts both old and new shapes, (b) backfill, (c) deploy code that requires only the new shape
   - Or a one-shot Server Action that the user runs once after deploy
   - Always include a rollback plan

5. **Test the change against existing data**:
   - Add a test in `tests/unit/schemas.test.ts` that parses a doc with the OLD shape — must succeed
   - Add a test that parses a doc with the NEW shape — must succeed

6. **Deploy order**:
   - More permissive rules → deploy rules first, then code
   - More restrictive rules → deploy code first, then rules

Reference: see `.claude/skills/update-firestore-schema/SKILL.md` for the full pattern.
