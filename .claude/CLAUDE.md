# Claude Code — Project Rules

> Project rules for Claude Code in this repo. The full agent contract is in
> [AGENTS.md](../AGENTS.md) at the repo root — **read that first**. This file
> only adds Claude-Code-specific guidance.

## Always read first
- @../AGENTS.md — project conventions, do/don't, regression watch
- @../README.md — stack overview
- @../DEPLOY.md — Cloud Run runbook (when deploying or debugging prod)

## Available skills
Use the `Skill` tool when the task matches one of these:

- `add-feature` — scaffolding a new feature folder under `src/features/<name>/`
- `add-server-action` — Server Action with auth + Zod boundary
- `update-firestore-schema` — adding/changing fields safely (schema + rules + types)
- `deploy-cloud-run` — deploying to Cloud Run + secret rotation
- `debug-prod` — Cloud Run logs / Firestore inspection / common production issues

## Available slash commands
- `/check` — run the full verify pipeline (typecheck + lint + test)
- `/dev` — start dev server with required env reminder
- `/migrate` — preview Firestore schema changes against existing user docs

## Default behaviors

### Verify before reporting done
After any code change, run:
```bash
pnpm typecheck && pnpm lint && pnpm test
```
For UI: also start `pnpm dev` and exercise the feature in a browser.

### When unsure about a Zod / Firestore change
Read [src/lib/schemas.ts](../src/lib/schemas.ts) **and** [firestore.rules](../firestore.rules) **and** check whether existing user documents would still validate. If migration is needed, propose it before writing code.

### Cost-sensitive operations
Before adding any of these, ask the user:
- A new Firestore listener (`onSnapshot`) or read-on-render pattern
- A new Gemini API call site
- A new Cloud Run env var or secret
- A change that affects Cloud Build pipeline (Dockerfile, cloudbuild.yaml)

### Security-sensitive files (treat as load-bearing)
- [src/middleware.ts](../src/middleware.ts) — auth gate
- [src/lib/auth/session.ts](../src/lib/auth/session.ts) — cookie verification
- [src/lib/firebase/admin.ts](../src/lib/firebase/admin.ts) — Admin SDK initialization
- [firestore.rules](../firestore.rules) — server-side authorization
- [src/app/api/chat/route.ts](../src/app/api/chat/route.ts) — Gemini proxy

When editing any of these, double-check the change does not weaken an invariant from AGENTS.md.

## Things only Claude Code does
- The `Skill` tool — invoke with `skill: <name>` from `.claude/skills/`
- Slash commands — `.claude/commands/*.md`
- Settings/permissions — `.claude/settings.json` and `.claude/settings.local.json`

For multi-IDE compatibility, **never** put project-wide rules here — put them in `AGENTS.md`.
