# PROGRESS.md — Running log of completed work

> Read this when: you want to know "what changed recently?" without scanning
> git log. This file is the project's **changelog as the AI sees it** — every
> non-trivial PR appends an entry.
>
> **Update rule:** add a single line per PR, newest first, format:
> `YYYY-MM-DD · #<pr> · <one-line summary>`. If the PR also changes
> `FEATURES.md` / `ROADMAP.md` / `ARCHITECTURE.md`, mention which.

## 2026

### April

- 2026-04-26 · _(this PR)_ · Added the AI-context system: `AGENTS.md` entry point, `.agents/context/` files (PROJECT, ARCHITECTURE, FEATURES, ROADMAP, PROGRESS, STACK, GLOSSARY, DECISIONS), `.agents/skills/update-context/SKILL.md` to enforce updates, freshness CI workflow, and PR-template checklist. Also seeded `ROADMAP.md` with proposed H1/H2/H3 features.
- 2026-04-26 · #1 · Initial scaffold for the Melodix monorepo (apps: api/web/miniapp; packages: shared/ui; CI; demo data; player engines).

---

> Add new entries above this line. Keep each entry to one line. If you need
> more space, link to the PR description.
