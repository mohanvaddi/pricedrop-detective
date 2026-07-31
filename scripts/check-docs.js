#!/usr/bin/env node
/*
 * docs-freshness check (advisory / non-blocking).
 *
 * Warns when a commit changes *functional* source without touching docs/. It is
 * intentionally non-blocking: pure bug fixes, refactors, and formatting can be
 * committed without doc edits. Its job is to nudge, not to gate.
 *
 * Wired into .husky/pre-commit. Run manually with: pnpm docs:check
 */
const { execSync } = require('child_process');

function staged() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Paths whose changes usually imply a docs update.
const FUNCTIONAL = [
  /^server\/.*\.(ts|tsx)$/,
  /^scrapers\/.*\.(ts|tsx|json)$/,
  /^shared\/.*\.(ts|tsx)$/,
  /^web\/src\/.*\.(ts|tsx)$/,
];
// Changes that are purely infra/test/config — don't require docs on their own.
const IGNORE = [
  /(^|\/)__tests__\//,
  /\.test\.(ts|tsx)$/,
  /(^|\/)scripts\//,
  /package(-lock)?\.json$/,
  /pnpm-lock\.yaml$/,
];

// Which doc to suggest for a given source path.
const HINTS = [
  [/^shared\/src\/db\/schema\.ts$/, 'docs/db-structure.md (regenerate the ER diagram + migration list)'],
  [/^scrapers\/src\/scraper\/(browser|session-manager)\./, 'docs/session-scraper.md'],
  [/^scrapers\/src\/scraper\//, 'docs/scrapers.md'],
  [/^scrapers\/src\/categorizer\./, 'docs/categorizer.md'],
  [/^scrapers\/src\/(scheduler|price-recorder|worker)\./, 'docs/workflow-architecture.md (+ docs/categorizer.md)'],
  [/^server\/src\/api\/routes\//, 'docs/workflow-architecture.md (+ web/src/lib/api.ts)'],
  [/^server\//, 'docs/code-architecture.md / docs/workflow-architecture.md'],
  [/^shared\//, 'docs/code-architecture.md / docs/db-structure.md'],
  [/^web\/src\//, 'docs/product-overview.md / docs/code-architecture.md'],
];

const files = staged();
const docsTouched = files.some((f) => f.startsWith('docs/') || f === '.github/copilot-instructions.md');
const functional = files.filter((f) => FUNCTIONAL.some((r) => r.test(f)) && !IGNORE.some((r) => r.test(f)));

if (functional.length === 0 || docsTouched) {
  process.exit(0);
}

const suggestions = new Set();
for (const f of functional) {
  const hint = HINTS.find(([r]) => r.test(f));
  if (hint) suggestions.add(hint[1]);
}

const y = '\x1b[33m';
const b = '\x1b[1m';
const r = '\x1b[0m';
console.warn(`\n${y}${b}⚠ docs-freshness:${r}${y} functional code changed but no docs/ update is staged.${r}`);
console.warn(`${y}  Changed:${r} ${functional.slice(0, 8).join(', ')}${functional.length > 8 ? ` (+${functional.length - 8} more)` : ''}`);
if (suggestions.size) {
  console.warn(`${y}  Consider updating:${r}`);
  for (const s of suggestions) console.warn(`${y}    • ${s}${r}`);
}
console.warn(`${y}  This is advisory — minor fixes/refactors need no docs. Commit proceeds.${r}`);
console.warn(`${y}  Tip: run the ${b}doc-updater${r}${y} skill to refresh docs.${r}\n`);
// Non-blocking: always succeed.
process.exit(0);
