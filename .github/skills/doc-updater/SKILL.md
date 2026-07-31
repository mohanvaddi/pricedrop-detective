---
name: doc-updater
description: Audit and update the project documentation in docs/ so it matches the current code. Invoke when asked to check, refresh, sync, or update the docs — or after any functional change to the codebase.
---

# Documentation Updater Skill

Keeps `docs/` (and `.github/copilot-instructions.md`) accurate against the actual
code of **pricedrop-detective**. Use it on demand ("update the docs", "are the
docs stale?") or right after changing functionality.

## Documentation map

| Doc | Source of truth it must track |
|-----|-------------------------------|
| `docs/README.md` | Overall structure, doc index, freshness policy |
| `docs/code-architecture.md` | Monorepo packages, module responsibilities, commands (`package.json`, `pnpm-workspace.yaml`) |
| `docs/workflow-architecture.md` | `scrapers/src/{index,worker,price-recorder,scheduler}.ts`, `server/src/services/notifier.ts`, routes |
| `docs/db-structure.md` | `shared/src/db/schema.ts`, `shared/drizzle/` migrations, indexes |
| `docs/product-overview.md` | Features, supported stores, `shared/src/limits.ts`, channels |
| `docs/scrapers.md` | `scrapers/src/scraper/**`, `detect.ts`, fetch strategies, registration steps |
| `docs/session-scraper.md` | `scrapers/src/scraper/{browser,session-manager}.ts`, `base.ts` session path, Camoufox/Dockerfile |
| `docs/categorizer.md` | `scrapers/src/categorizer.ts`, `scrapers/src/scheduler.ts` |
| `.github/copilot-instructions.md` | High-level architecture + conventions (keep terse) |

## Process

1. **Scope the change.** Determine what changed — from the user's description, a
   diff (`git diff`, `git diff --cached`, or a branch range), or the whole repo
   for a full audit.
2. **Map changed files → docs** using the table above. Only touch docs whose
   source of truth actually changed. Skip pure bug fixes / refactors / formatting
   that don't alter documented behaviour.
3. **Read both sides.** Read the changed source AND the current doc section.
   Never rewrite from memory — verify against the code.
4. **Update precisely.** Edit only the stale parts. Preserve the existing voice,
   heading structure, and Mermaid diagrams. Keep examples runnable and paths
   correct.
5. **Special cases:**
   - **Schema change** (`shared/src/db/schema.ts`): regenerate the **Mermaid ER
     diagram**, the table reference, the index table, and append the new
     migration tag in `docs/db-structure.md`. Get tags from
     `shared/drizzle/meta/_journal.json`.
     ```bash
     grep -o '"tag": *"[^"]*"' shared/drizzle/meta/_journal.json
     ```
   - **New platform**: update `docs/scrapers.md` (registration list, strategy) and
     `docs/product-overview.md` (store count + list). Then run the `skill-updater`
     skill to refresh `scraper-generator`.
   - **New fetch strategy / Camoufox change**: update `docs/session-scraper.md`
     and `docs/scrapers.md`.
   - **New/changed API route**: update `docs/workflow-architecture.md`; confirm
     `web/src/lib/api.ts` matches.
   - **New command / script**: update the command tables in
     `docs/code-architecture.md`.
6. **Verify.** Check that:
   - all cross-doc links resolve (relative paths),
   - Mermaid blocks are syntactically valid,
   - code snippets reference real files/functions,
   - no doc claims a behaviour the code no longer has.
7. **Report.** Summarize which docs changed and why. If some functional change
   needs a product decision before documenting, flag it instead of guessing.

## Guardrails

- **Accuracy over completeness** — never invent behaviour to fill a gap.
- **Minimal diffs** — don't reflow unrelated prose or reorder sections.
- **Don't document secrets** — reference env var *names* only.
- **Match conventions** — Prettier style, Indian ₹ pricing, `@pricedrop/shared/*`
  import paths, `noUncheckedIndexedAccess` caveats.

## Quick full-audit checklist

- [ ] `docs/db-structure.md` ER diagram matches `schema.ts` (tables, columns, FKs)
- [ ] Migration list matches `shared/drizzle/meta/_journal.json`
- [ ] Supported-store count/list matches `scrapers/src/detect.ts` `HOSTNAME_MAP`
- [ ] Fetch strategy per store matches `selectors.json`
- [ ] Command tables match `package.json` scripts
- [ ] Limits match `shared/src/limits.ts`
- [ ] Every relative doc link resolves
