# Skill — Keep the AI-context files fresh on every PR

## When to use this skill

Activate this skill on **every PR that changes code or configuration** in this
repo. The repo's promise to future AI agents is that
[`AGENTS.md`](../../../AGENTS.md) + [`.agents/context/`](../../context/) is
always trustworthy. That only holds if you update them in the same PR as your
code change.

> The full update contract (which file maps to which kind of change) lives in
> [`AGENTS.md`](../../../AGENTS.md) §4. This skill is the **operational
> checklist** an AI agent runs through before opening the PR.

## Step-by-step checklist

Run these in order. Don't skip steps. If a step "doesn't apply", say so
explicitly in your PR description rather than silently dropping it.

### 1. Classify the change

Pick all labels that apply to your PR:

- `feat` — adds user-visible behaviour
- `fix` — corrects a bug
- `refactor` — pure code reorganisation, no behaviour change
- `chore` — tooling, deps, scripts, CI
- `docs` — documentation only
- `arch` — non-obvious architectural choice (auth, caching, schema, …)

### 2. Decide which context files to touch

| Label / situation                                               | Must-update files                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `feat` adding/removing a user-visible feature                   | `FEATURES.md`, `PROGRESS.md`. If it was on the roadmap, also `ROADMAP.md`. |
| `feat` adding a new module / route group / Prisma model         | `ARCHITECTURE.md`, plus the rule above                                     |
| `fix` for a non-trivial bug                                     | `PROGRESS.md` (1-line entry)                                               |
| `refactor` that moves files or renames modules                  | `ARCHITECTURE.md`, `PROGRESS.md`                                           |
| `chore` bumping a major dep, changing a port / env var / script | `STACK.md`, `PROGRESS.md`                                                  |
| `docs` only                                                     | usually none, unless you're adding a new domain term → `GLOSSARY.md`       |
| `arch`                                                          | `DECISIONS.md` (append a new ADR), `ARCHITECTURE.md`, `PROGRESS.md`        |
| Anything else of substance                                      | At minimum, append a 1-line entry to `PROGRESS.md`                         |

### 3. Apply the updates

For each file you decided to touch:

- **`FEATURES.md`** — add a new row, or flip an existing row's status emoji
  (✅ done · 🟡 partial · 🔵 planned · ⛔ removed). Keep one row per feature.
- **`ROADMAP.md`** — flip checkbox state (`[ ]` → `[~]` → `[x]`). Move dropped
  items to `[-]` rather than deleting them. Add new ideas under **Backlog**.
- **`PROGRESS.md`** — append a single line at the top of the most recent
  month, format: `YYYY-MM-DD · #<pr> · <one-line summary>`. Use the placeholder
  `*(this PR)*` if you don't yet know the PR number.
- **`ARCHITECTURE.md`** — update the relevant section's table or paragraph.
  Keep file references in `path:line` form so they stay clickable.
- **`STACK.md`** — bump the version row, port, env var, or script line.
  Keep this file in lockstep with `package.json` / config files.
- **`GLOSSARY.md`** — add a row when introducing a new domain term that won't
  be obvious from its identifier alone.
- **`DECISIONS.md`** — append an ADR using the template at the top of the
  file. ADRs are append-only; supersede rather than edit.

### 4. Sanity-check yourself

Before committing, ask:

1. _"If a fresh AI agent reads only `AGENTS.md` and the files I touched, will
   it understand what this PR does and why?"_ If no, add more context.
2. _"Is anything in `FEATURES.md` now wrong because of this PR?"_ Update those
   rows even if your task didn't directly touch them.
3. _"Is the routing table in `AGENTS.md` §2 still accurate?"_ Update it if your
   PR moved or renamed a context file.

### 5. Reflect in the PR description

The PR template ([`.github/pull_request_template.md`](../../../.github/pull_request_template.md))
has an **AI-context update** checklist. Tick the boxes honestly:

```
- [ ] FEATURES.md updated (or N/A)
- [ ] ROADMAP.md updated (or N/A)
- [ ] PROGRESS.md entry added
- [ ] ARCHITECTURE.md updated (or N/A)
- [ ] STACK.md updated (or N/A)
- [ ] GLOSSARY.md updated (or N/A)
- [ ] DECISIONS.md ADR appended (or N/A)
```

If a box is unticked, justify it in the PR description.

### 6. Watch the CI freshness check

`.github/workflows/context-freshness.yml` runs on every PR. It compares the
diff against `main`:

- If your PR changes files under `apps/`, `packages/`, or top-level configs
  but does **not** change anything under `.agents/context/`, the job posts a
  warning. **Read it** — either the PR is genuinely doc-free (rare) or you
  forgot to update something.

## Anti-patterns (don't do these)

- **Silent removal.** Removing a feature without flipping its `FEATURES.md`
  row to `⛔ removed` makes the catalog lie.
- **Editing past ADRs.** Append a superseding ADR instead.
- **"Will update later" PRs.** Context updates land in the same PR as the
  code change. There is no "later".
- **Massive prose.** If a section grows past ~50 lines, refactor it into a
  table or push detail into a sub-file. This system optimises for _fast
  reads_, not completeness.
- **Hard-coding secrets.** Never paste real `JAMENDO_CLIENT_ID`,
  `TELEGRAM_BOT_TOKEN`, etc. into context files. Reference env-var names only.

## Quick local check before pushing

```bash
# What did I change?
git diff --stat origin/main...HEAD

# Did I update at least one .agents/context/ file?
git diff --name-only origin/main...HEAD | grep -E '^\.agents/context/' || \
  echo "WARNING: no context files touched — re-read this skill."
```
