# Antigravity — Project Rules

> Antigravity-specific entry point. The full agent contract is in
> [AGENTS.md](../AGENTS.md) at the repo root — read that first. This file only
> adds Antigravity-specific guidance.

## Read before acting
1. `AGENTS.md` (repo root) — invariants, conventions, do/don't list
2. `README.md` — stack overview
3. `DEPLOY.md` — only when working on Cloud Run / Cloud Build

## Antigravity workflow notes

- This repo uses **pnpm** with a committed lockfile — Antigravity should never run `npm install` / `yarn install`
- The dev server runs on `pnpm dev` (port 3000, Turbopack)
- The verify pipeline before reporting done is `pnpm typecheck && pnpm lint && pnpm test`
- For UI changes, use the in-IDE browser preview to exercise the feature

## Skills (also available to Claude Code under `.claude/skills/`)

The same skill files live in two places by design:
- `.claude/skills/<name>/SKILL.md` — invoked via Claude Code's `Skill` tool
- `.antigravity/skills/<name>.md` — readable by Antigravity as workflow guides

Both reference the same patterns. If you change one, mirror the change to the other.

Available skills:
- `add-feature` — feature folder scaffolding
- `add-server-action` — Server Action with auth + Zod
- `update-firestore-schema` — schema + rules co-evolution
- `deploy-cloud-run` — deploy + secret management
- `debug-prod` — production troubleshooting

## What never to do

See the **What never to do** section in `AGENTS.md`. Highlights:

- Never commit secrets (`.env.local`, service account JSON)
- Never bypass `pnpm-lock.yaml` integrity (`--frozen-lockfile` is required by Cloud Build)
- Never use `window.alert` / `window.prompt` / `window.confirm` for user flows
- Never skip the verify pipeline before reporting done
