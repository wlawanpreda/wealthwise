---
description: Run the full verify pipeline (typecheck + lint + tests). Use after any code change before reporting done.
---

Run the full verify pipeline for this project:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

If any step fails:
1. Show the user the exact failure output (don't summarize too aggressively)
2. Identify the root cause
3. Propose a fix and ask before applying (unless the fix is mechanical, like a missing import)

If all pass:
- Report which steps ran and that all passed
- Do NOT volunteer additional commands like `pnpm build` unless the change touches Dockerfile / cloudbuild.yaml / next.config.ts
