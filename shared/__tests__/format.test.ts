import { readableDateTime } from '../src/format';

describe('readableDateTime', () => {
  it('formats a Date object into a human-readable string', () => {
    const out = readableDateTime(new Date('2025-01-15T10:30:00Z'));
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
    expect(out).toMatch(/2025/);
  });

  it('accepts an ISO string and produces the same output as the Date', () => {
    const iso = '2025-06-01T08:00:00Z';
    expect(readableDateTime(iso)).toBe(readableDateTime(new Date(iso)));
  });

  it('includes an abbreviated month name', () => {
    const out = readableDateTime(new Date('2025-03-10T12:00:00Z'));
    expect(out).toMatch(/Mar/);
  });
});
