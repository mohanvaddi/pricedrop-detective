---
name: review-fixer
description: Implement the fixes raised in a docs/review/ report as a senior engineer, verify them, and check off the items. Invoke when asked to address, fix, or resolve code-review findings.
---

# Review Fixer Skill

Act as the senior engineer who **resolves** the findings in a `docs/review/`
report — implementing correct fixes, verifying them, and updating the report's
checklist. Pairs with the `code-reviewer` skill.

## When to use

- "Fix the review findings", "address docs/review/0001", "resolve the review".

## Process

1. **Select the report.** Use the one named by the user, else the most recent
   `open` report in `docs/review/` (highest index). If several are open, ask which
   (or do the highest-severity one first).
2. **Read it fully.** Parse the findings and the **Resolution checklist**. Build a
   plan ordered by severity: Critical → High → Medium → Low → Nit.
3. **Verify each finding first.** Open the cited `file:line` and confirm the issue
   still exists and the diagnosis is correct. If a finding is wrong or already
   fixed, note it in the report rather than making a spurious change.
4. **Implement minimal, correct fixes.** One logical fix at a time. Respect the
   codebase conventions:
   - `CustomError` with a meaningful `name` for handled errors.
   - `noUncheckedIndexedAccess` — guard/`!` after checks; no unsafe casts.
   - Domain logic in `shared`; keep the `server`/`scrapers` boundary intact.
   - Prettier (single quotes, ES5 commas, 150-char), Indian ₹ integer pricing.
   - If a fix changes the **DB schema**, run `pnpm db:generate` and update
     `docs/db-structure.md`.
   - If a fix changes documented behaviour, update the relevant `docs/` page (or
     invoke the `doc-updater` skill).
5. **Verify the change.** Run the smallest sufficient checks:
   ```bash
   pnpm typecheck                                  # tsc --noEmit (whole workspace)
   pnpm test                                       # or a targeted jest suite
   docker compose exec scrapers npx jest --config jest.config.ts   # browser/session tests
   ```
   For scraper fixes, do a live check where relevant (e.g.
   `curl -s -X POST localhost:5001/scrape -d '{"url":"..."}'`). Reproduce the
   original symptom and confirm it's gone.
6. **Update the report.** Tick the checklist items you completed
   (`- [x]`), and under each addressed finding add a short
   **Resolution:** note (what changed + `commit/file:line`). When all items are
   done, set the report header **Status:** to `resolved` (or `partially-resolved`
   with a note on what remains and why).
7. **Report back.** Summarize fixes made, anything deferred (with justification),
   and verification evidence (tests/build/live check results).

## Guardrails

- **Fix the finding, not the whole file** — no opportunistic rewrites; avoid
  scope creep beyond the review.
- **Don't fake resolution** — only check off an item that is genuinely fixed and
  verified. Disagree explicitly (in the report) rather than silently skipping.
- **No commits unless the user says so** (repo policy in
  `.github/copilot-instructions.md`). Implement + verify, then wait.
- **Keep the audit trail** — never delete findings; mark them resolved.
- Prefer ecosystem tooling (drizzle-kit, jest, tsc) over manual edits.

## Definition of done

- Every Critical/High item is fixed and verified, or explicitly justified as
  deferred/rejected in the report.
- `pnpm typecheck` clean; relevant tests pass.
- Docs updated for any behaviour change.
- Report checklist reflects reality; **Status** updated.
