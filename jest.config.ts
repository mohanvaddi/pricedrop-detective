import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Each test hits a live URL — allow up to 30s per case
  testTimeout: 30_000,
  // Only show details for failures; keep output clean on success
  verbose: false,
};

export default config;
