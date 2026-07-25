import type { Config } from 'jest';

const config: Config = {
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', {
      jsc: {
        target: 'es2016',
        parser: { syntax: 'typescript' },
      },
      module: { type: 'commonjs' },
    }],
  },
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Each test hits a live URL — allow up to 30s per case
  testTimeout: 30_000,
  // Only show details for failures; keep output clean on success
  verbose: false,
};

export default config;
