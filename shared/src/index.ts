/**
 * Convenience barrel for `@pricedrop/shared`. Backend packages import specific
 * subpaths (e.g. `@pricedrop/shared/db/products`) to reach the drizzle-backed
 * DB layer; this barrel intentionally exposes only the framework-agnostic,
 * dependency-light modules (types, errors, hashing, limits, formatting, enums)
 * so it stays safe to import from any package.
 */
export * from './types';
export * from './error';
export * from './hash';
export * from './limits';
export * from './format';
export * from './enums';
