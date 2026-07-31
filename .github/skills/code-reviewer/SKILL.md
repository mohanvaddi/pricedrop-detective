---
name: code-reviewer
description: Perform a senior/staff-engineer-level code review and write a structured report into docs/review/. Invoke when asked to review code, audit a change, review a PR/branch/diff, or assess a subsystem.
---

# Code Reviewer Skill

Produce a rigorous, FAANG senior/staff-engineer-level code review of
pricedrop-detective and persist it as a report in `docs/review/`. The report is
designed to be consumed by the `review-fixer` skill.

## When to use

- "Review my changes / this PR / this branch / this file."
- "Audit the subscriptions flow / session manager / scheduler."
- Before merging a non-trivial change.

For dedicated **security** vulnerability hunts, prefer the built-in
`/security-review`; this skill covers correctness, design, and maintainability
(and flags obvious security issues it finds).

## Determine the scope

- **Diff review** (default): `git diff`, `git diff --cached`, or a branch range
  `git diff main...HEAD --stat` then per-file. Review only changed lines + their
  blast radius.
- **Subsystem review**: read the named module and its collaborators.
- **PR review**: fetch the PR via the GitHub tools, then diff its head vs base.

State the scope explicitly at the top of the report.

## What to evaluate

Review against this project's realities (see `docs/`):

1. **Correctness** — logic bugs, off-by-one, wrong async/await, unhandled
   rejections, race conditions (e.g. overlapping scrape batches), incorrect
   price/availability math.
2. **Types & null-safety** — `noUncheckedIndexedAccess`: unchecked `T|undefined`
   indexing; unsafe `as` casts; `!` on genuinely nullable values.
3. **Error handling** — `CustomError` used with a meaningful `name`? Errors
   swallowed silently where they shouldn't be? Failure paths update
   `product_metrics.failure_count` / `last_scraped_at`?
4. **Data & schema** — migrations present for schema changes? Indexes for new
   query patterns? Append-only `prices` respected? FK cascade correctness?
5. **Scraper robustness** — cheapest viable fetch strategy chosen? Selectors
   resilient (JSON-LD + fallback)? Integer price parsing? `networkidle` avoided
   where it hangs? Session/Akamai handling per `docs/session-scraper.md`?
6. **Architecture & boundaries** — respects the two seams (Postgres + one
   `server→scrapers` HTTP call)? No browser runtime pulled into the server? Domain
   logic in `shared`, not duplicated?
7. **Security** — input validation (zod), authz on routes (`auth` middleware),
   no secrets in code/logs, SSRF/URL handling on scrape inputs, SQL built safely
   (Drizzle/parameterized).
8. **Performance** — N+1 queries, unbounded loops over products, redundant
   scrapes, missing metrics rollup usage.
9. **Tests** — meaningful coverage for the change? Live-scrape tests updated
   (`scrapers/tests.json`)?
10. **Maintainability** — naming, dead code, duplication, unclear control flow,
    missing/incorrect comments, **and whether `docs/` was updated** for the change.

## Severity rubric

| Severity | Bar |
|----------|-----|
| **Critical** | Data loss, auth bypass, secret leak, or guaranteed prod break — block merge |
| **High** | Real bug under realistic conditions; incorrect user-facing behaviour |
| **Medium** | Latent bug, missing edge case, notable design smell |
| **Low** | Minor maintainability/readability |
| **Nit** | Style/preference; optional |

Be specific and cite `file:line`. Prefer concrete, minimal fixes over vague
advice. Praise genuinely good choices briefly. No nit-flooding — group trivial
items.

## Output: write the report

1. Determine the next index: list `docs/review/` and use the next zero-padded
   number (`0001`, `0002`, …).
2. Write `docs/review/NNNN-<kebab-slug>.md` using the template below.
3. Do **not** modify source code — this skill only reviews. Fixes are the
   `review-fixer` skill's job.

### Report template

```markdown
# Review NNNN — <title>

- **Date:** <YYYY-MM-DD>
- **Scope:** <diff / branch range / files / subsystem>
- **Reviewer:** code-reviewer skill
- **Status:** open

## Summary
<2–5 sentences: overall assessment, biggest risks, merge recommendation
(approve / approve-with-changes / request-changes).>

## Findings

### [Critical] <short title> — `path/to/file.ts:LINE`
**Problem.** <what's wrong and why it matters>
**Fix.** <concrete suggested change; small snippet if helpful>

### [High] ...
### [Medium] ...
### [Low] ...
### [Nit] ...

## What's good
<brief list of solid decisions worth keeping>

## Resolution checklist
- [ ] (Critical) <file:line> <one-line action>
- [ ] (High) ...
- [ ] (Medium) ...
```

The **Resolution checklist** is required — the `review-fixer` skill ticks it off.

## After writing

- Report the path of the created review file and a one-line severity tally
  (e.g. "1 Critical, 2 High, 3 Medium").
- Suggest running the `review-fixer` skill to implement the fixes.
