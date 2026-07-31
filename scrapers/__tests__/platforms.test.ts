import { listPlatforms, PLATFORM_NAMES } from '../src/platforms';

describe('listPlatforms', () => {
  const platforms = listPlatforms();

  it('returns an entry for every named platform', () => {
    expect(platforms).toHaveLength(Object.keys(PLATFORM_NAMES).length);
  });

  it('shapes each entry as { id, name, fetchMethod }', () => {
    for (const p of platforms) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(typeof p.fetchMethod).toBe('string');
    }
  });

  it('maps the known fetch strategies', () => {
    const get = (id: string) => platforms.find((p) => p.id === id)!;
    expect(get('amazon').fetchMethod).toBe('browser');
    expect(get('flipkart').fetchMethod).toBe('axios');
    expect(get('ajio').fetchMethod).toBe('session');
  });

  it('uses friendly display names', () => {
    const get = (id: string) => platforms.find((p) => p.id === id)!;
    expect(get('ajio').name).toBe('Ajio');
    expect(get('bigbasket').name).toBe('BigBasket');
    expect(get('nykaafashion').name).toBe('Nykaa Fashion');
  });
});
