---
name: skill-updater
description: Refresh an existing Copilot skill (e.g. scraper-generator) so its instructions match the current codebase. Invoke when asked to update, sync, or fix a skill after the project has changed.
---

# Skill Updater Skill

Keeps the other skills in `.github/skills/` accurate as the codebase evolves.
Skills are only useful if their step-by-step instructions, file paths, and code
snippets still match reality — this skill audits and repairs them.

## Skills in this repo

| Skill | Purpose | Primary source of truth |
|-------|---------|-------------------------|
| `scraper-generator` | Add a new store scraper end-to-end | `scrapers/src/scraper/**`, `detect.ts`, `selectors.json`, web store components |
| `doc-updater` | Keep `docs/` in sync with code | `docs/**`, the doc map |
| `code-reviewer` | Produce reviews into `docs/review/` | conventions in `docs/` + code |
| `review-fixer` | Implement review findings | `docs/review/*.md` |
| `skill-updater` | (this) refresh skills | all of the above |

## Process

1. **Pick the target skill.** Default to the one named by the user; otherwise
   audit all skills.
2. **Re-derive the ground truth.** For the target skill, re-read its primary
   source files and confirm every claim:
   - **File paths exist** (`scrapers/src/scraper/platforms/`, `web/src/...`, etc.).
   - **Commands are current** — cross-check against root `package.json` scripts.
     Common drift: `ts-node` → `tsx`, test path
     `__tests__/scraper.test.ts` → `scrapers/__tests__/scraper.test.ts`,
     `npx jest __tests__/...` → `pnpm test` / `docker compose exec scrapers npx jest`.
   - **Registration steps** match the actual files that must change (compare with
     the list in `docs/scrapers.md`).
   - **Fetch strategies** match `scrapers/src/scraper/base.ts` and
     `docs/session-scraper.md` — e.g. AJIO is now **Camoufox session render +
     cookie reuse** (`fetchPageWithSession`), *not* a manual `curl` file.
3. **Diff intent vs reality.** List each stale/incorrect instruction.
4. **Update the SKILL.md** with minimal, precise edits. Preserve the frontmatter
   (`name`, `description`), overall structure, and any working examples. Fix
   paths, commands, code snippets, and checklists.
5. **Keep skills and docs consistent.** A skill should reference the relevant
   `docs/` page rather than duplicating large explanations. If the underlying
   behaviour changed, run the `doc-updater` skill too.
6. **Sanity-check the frontmatter.** `description` must clearly state *when* to
   invoke the skill (trigger phrases), since that drives auto-selection.
7. **Report** what changed in each skill and why.

## Common drift to check (scraper-generator)

- [ ] Runner is `tsx` (not `ts-node`) everywhere.
- [ ] Test command: `pnpm test` or `npx jest scrapers/__tests__/scraper.test.ts --testTimeout=120000`.
- [ ] AJIO / Akamai strategy references `fetchPageWithSession` + `docs/session-scraper.md`, not a curl-file workflow.
- [ ] Browser strategy references **Camoufox** (`fetchPageWithBrowser`), not raw Chromium.
- [ ] Registration list matches these files: `platforms/{p}.ts`, `selectors.json`,
      `scraper/index.ts`, `detect.ts` (`HOSTNAME_MAP`), `worker.ts` allow-list,
      `server/src/api/routes/platforms.ts`, `web/src/components/StoreBadge.tsx`,
      `web/src/components/StoreDrawer.tsx`, `web/src/pages/Home.tsx`, `tests.json`.
- [ ] `noUncheckedIndexedAccess` guidance present.
- [ ] Prettier conventions (single quotes, 150-char) noted where relevant.

## Guardrails

- Verify against code before editing — never "fix" a skill from memory.
- Minimal diffs; don't restructure a working skill.
- Don't remove still-valid guidance just because it's verbose.
- Never embed secrets or real credentials in examples.
