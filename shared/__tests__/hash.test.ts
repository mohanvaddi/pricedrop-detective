import { caluculateHash } from '../src/hash';

describe('caluculateHash', () => {
  it('returns an 8-char hex string', () => {
    const h = caluculateHash('hello');
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is deterministic for the same input', () => {
    expect(caluculateHash('abc')).toBe(caluculateHash('abc'));
  });

  it('differs for different inputs', () => {
    expect(caluculateHash('abc')).not.toBe(caluculateHash('abd'));
  });

  it('matches the first 8 hex chars of sha256', () => {
    // sha256('') = e3b0c442...
    expect(caluculateHash('')).toBe('e3b0c442');
  });
});
