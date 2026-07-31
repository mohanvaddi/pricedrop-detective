import type { Config } from 'jest';

const config: Config = {
  transform: {
    '^.+\\.[jt]sx?$': ['@swc/jest', {
      jsc: {
        target: 'es2016',
        parser: { syntax: 'typescript' },
      },
      module: { type: 'commonjs' },
    }],
  },
  // camoufox-js and parts of its dependency tree ship as ESM. Transform all
  // loaded node_modules to CJS so the browser-based scrapers run under Jest
  // (transforming already-CJS files is a harmless passthrough).
  transformIgnorePatterns: [],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@pricedrop/shared$': '<rootDir>/shared/src/index.ts',
    '^@pricedrop/shared/(.*)$': '<rootDir>/shared/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Each test hits a live URL — allow up to 60s per case (browser-based scrapers are slower)
  testTimeout: 60_000,
  // Only show details for failures; keep output clean on success
  verbose: false,
};

export default config;
