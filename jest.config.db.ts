import type { Config } from 'jest';

/**
 * DB integration suite (`pnpm test:db`): runs *.db.test.ts against a real,
 * throwaway Postgres started by scripts/test-db.sh. Serial (maxWorkers:1) so
 * specs don't race on shared tables; globalSetup guards DATABASE_URL is set.
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
  testMatch: ['**/__tests__/**/*.db.test.ts'],
  globalSetup: '<rootDir>/scripts/jest-db-setup.ts',
  maxWorkers: 1,
  testTimeout: 30_000,
  verbose: false,
};

export default config;
