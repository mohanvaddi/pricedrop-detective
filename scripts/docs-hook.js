#!/usr/bin/env node
/*
 * docs-freshness Copilot CLI hook (postToolUse, matcher: edit|create).
 *
 * Fires after a file-editing tool (`edit` / `create`) completes successfully.
 * Reads the hook payload from stdin, extracts the edited file path from
 * `toolArgs`, and — when the path is *functional* source that maps to a doc —
 * injects `additionalContext` reminding the agent to update the matching doc in
 * the same change. Emits `{}` (no-op) for tests, scripts, config, and docs.
 *
 * Advisory only: it never blocks a tool call. postToolUse cannot deny — the
 * worst case is an ignored reminder. Minor bug fixes / refactors can proceed
 * without doc edits; the reminder just nudges.
 *
 * Wired via .github/hooks/docs-freshness.json. Debug locally with:
 *   echo '{"toolName":"edit","toolArgs":{"path":"scrapers/src/scraper/base.ts"}}' | node scripts/docs-hook.js
 */

// Paths whose changes usually imply a docs update.
const FUNCTIONAL = [
  /(^|\/)server\/.*\.(ts|tsx)$/,
  /(^|\/)scrapers\/.*\.(ts|tsx|json)$/,
  /(^|\/)shared\/.*\.(ts|tsx)$/,
  /(^|\/)web\/src\/.*\.(ts|tsx)$/,
];
// Changes that are purely infra/test/config — don't require docs on their own.
const IGNORE = [
  /(^|\/)__tests__\//,
  /\.test\.(ts|tsx)$/,
  /(^|\/)scripts\//,
  /package(-lock)?\.json$/,
  /pnpm-lock\.yaml$/,
  /(^|\/)docs\//,
  /copilot-instructions\.md$/,
];

// Which doc to suggest for a given source path (first match wins).
const HINTS = [
  [/(^|\/)shared\/src\/db\/schema\.ts$/, 'docs/db-structure.md (regenerate the ER diagram + migration list; run pnpm db:generate)'],
  [/(^|\/)scrapers\/src\/scraper\/(browser|session-manager)\./, 'docs/session-scraper.md'],
  [/(^|\/)scrapers\/src\/scraper\//, 'docs/scrapers.md (+ the scraper-generator skill)'],
  [/(^|\/)scrapers\/src\/categorizer\./, 'docs/categorizer.md'],
  [/(^|\/)scrapers\/src\/(scheduler|price-recorder|worker)\./, 'docs/workflow-architecture.md (+ docs/categorizer.md)'],
  [/(^|\/)server\/src\/api\/routes\//, 'docs/workflow-architecture.md (+ web/src/lib/api.ts)'],
  [/(^|\/)server\//, 'docs/code-architecture.md / docs/workflow-architecture.md'],
  [/(^|\/)shared\//, 'docs/code-architecture.md / docs/db-structure.md'],
  [/(^|\/)web\/src\//, 'docs/product-overview.md / docs/code-architecture.md'],
];

function noop() {
  process.stdout.write('{}');
  process.exit(0);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
    // If nothing is piped, don't hang.
    setTimeout(() => resolve(data), 2000);
  });
}

// Pull candidate file path(s) out of a tool's arguments. `edit`/`create` use
// `path`; be tolerant of camelCase / snake_case / stringified JSON payloads.
function extractPaths(toolArgs) {
  let args = toolArgs;
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch {
      return [];
    }
  }
  if (!args || typeof args !== 'object') return [];
  const keys = ['path', 'file_path', 'filePath', 'file', 'filename'];
  const out = [];
  for (const k of keys) {
    if (typeof args[k] === 'string' && args[k]) out.push(args[k]);
  }
  return out;
}

// Normalise absolute / cwd-prefixed paths to repo-relative-ish form.
function normalize(p, cwd) {
  let s = p.replace(/\\/g, '/');
  if (cwd) {
    const c = String(cwd).replace(/\\/g, '/').replace(/\/$/, '');
    if (s.startsWith(c + '/')) s = s.slice(c.length + 1);
  }
  return s;
}

(async () => {
  const raw = await readStdin();
  if (!raw.trim()) noop();

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    noop();
  }

  const toolArgs = payload.toolArgs ?? payload.tool_input;
  const cwd = payload.cwd;
  const paths = extractPaths(toolArgs).map((p) => normalize(p, cwd));
  if (paths.length === 0) noop();

  const functional = paths.filter((f) => FUNCTIONAL.some((r) => r.test(f)) && !IGNORE.some((r) => r.test(f)));
  if (functional.length === 0) noop();

  const suggestions = new Set();
  for (const f of functional) {
    const hint = HINTS.find(([r]) => r.test(f));
    if (hint) suggestions.add(hint[1]);
  }

  const lines = [];
  lines.push('📝 docs-freshness reminder: you edited functional source — update the matching doc in this same change (skip only for pure bug fixes / refactors / formatting that do not change documented behaviour).');
  lines.push('Edited: ' + functional.join(', '));
  if (suggestions.size) {
    lines.push('Likely doc(s) to update: ' + Array.from(suggestions).join('; '));
  }
  lines.push('Tip: the doc-updater skill can refresh docs, and docs/ is the source of truth per .github/copilot-instructions.md.');

  process.stdout.write(JSON.stringify({ additionalContext: lines.join('\n') }));
  process.exit(0);
})();
