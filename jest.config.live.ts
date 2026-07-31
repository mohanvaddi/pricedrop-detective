import type { Config } from 'jest';

/**
 * Live scrape suite (`pnpm test:live`): opt-in, network + Camoufox dependent.
 * Scrapes one store per fetch strategy (axios / browser / session). Slow and
 * flaky by nature, so excluded from the default `pnpm test`.
 */
const config: Config = {
  transform: {
    '^.+\\.[jt]sx?$': [
      '@swc/jest',
      { jsc: { target: 'es2016', parser: { syntax: 'typescript' } }, module: { type: 'commonjs' } },
    ],
  },
  transformIgnorePatterns: [],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@pricedrop/shared$': '<rootDir>/shared/src/index.ts',
    '^@pricedrop/shared/(.*)$': '<rootDir>/shared/src/$1',
  },
  testMatch: ['**/__tests__/**/*.live.test.ts'],
  maxWorkers: 1,
  testTimeout: 90_000,
  verbose: false,
};

export default config;
