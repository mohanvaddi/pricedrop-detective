import type { Config } from 'jest';

const transform: Config['transform'] = {
  '^.+\\.[jt]sx?$': [
    '@swc/jest',
    { jsc: { target: 'es2016', parser: { syntax: 'typescript' } }, module: { type: 'commonjs' } },
  ],
};

const moduleNameMapper: Config['moduleNameMapper'] = {
  '^@pricedrop/shared$': '<rootDir>/shared/src/index.ts',
  '^@pricedrop/shared/(.*)$': '<rootDir>/shared/src/$1',
};

/**
 * Unit suite (default `pnpm test`): fast, deterministic, offline. All DB,
 * network and browser collaborators are mocked; scraper extraction runs against
 * fixture HTML. DB integration (*.db.test.ts) and live scraping (*.live.test.ts)
 * run under their own configs and are excluded here.
 */
const config: Config = {
  transform,
  // camoufox-js and parts of its dependency tree ship as ESM; transform all of
  // node_modules to CJS so browser-based scrapers load under Jest.
  transformIgnorePatterns: [],
  testEnvironment: 'node',
  moduleNameMapper,
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.db\\.test\\.ts$', '\\.live\\.test\\.ts$'],
  clearMocks: true,
  testTimeout: 15_000,
  verbose: false,
  // @swc/jest transforms code, so Jest's default Babel/Istanbul instrumentation
  // can't see it — use the V8 provider for accurate `--coverage` numbers.
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'scrapers/src/**/*.ts',
    'server/src/**/*.ts',
    'shared/src/**/*.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageDirectory: 'coverage',
};

export default config;
