# Code Reviews

Senior-engineer code-review reports for PriceDrop Detective live in this folder.

## Workflow

1. **Generate a review** — run the [`code-reviewer`](../../.github/skills/code-reviewer/SKILL.md)
   skill. It analyzes the target (a diff, a branch, a PR, or a subsystem) and
   writes a structured report here as `NNNN-<slug>.md`.
2. **Fix the findings** — run the [`review-fixer`](../../.github/skills/review-fixer/SKILL.md)
   skill against a report in this folder. It implements the fixes, verifies them,
   and checks off the items in the report.

## Report naming

```
docs/review/0001-subscriptions-route-audit.md
docs/review/0002-session-manager-review.md
```

Zero-padded, incrementing index + a short kebab-case slug. Keep completed reports
for history (mark items resolved rather than deleting).

## Report anatomy

Each report follows the template the `code-reviewer` skill emits:

- **Scope & summary** — what was reviewed, overall assessment.
- **Findings** — each with a **severity** (Critical / High / Medium / Low /
  Nit), location (`file:line`), explanation, and a concrete suggested fix.
- **Checklist** — a machine-friendly task list the `review-fixer` skill ticks off.

## Severities

| Severity | Meaning |
|----------|---------|
| Critical | Data loss, security hole, or production outage risk — fix before merge |
| High | Real bug or correctness issue under realistic conditions |
| Medium | Latent bug, missing edge-case handling, or notable design smell |
| Low | Minor maintainability/readability issue |
| Nit | Style/preference; optional |
