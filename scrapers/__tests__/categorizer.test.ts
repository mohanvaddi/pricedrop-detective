import { ProductCategorizer } from '../src/categorizer';

const c = new ProductCategorizer();

describe('ProductCategorizer.categorize', () => {
  it('categorizes a phone by exact product-type keyword', () => {
    expect(c.categorize({ title: 'Apple iPhone 15 (128 GB)' })).toEqual({
      category: 'electronics',
      productType: 'phone',
    });
  });

  it('categorizes a laptop', () => {
    const r = c.categorize({ title: 'Lenovo IdeaPad Slim 3 Laptop' });
    expect(r.category).toBe('electronics');
    expect(r.productType).toBe('laptop');
  });

  it('categorizes fashion (shoes)', () => {
    const r = c.categorize({ title: 'Nike Downshifter Running Shoes' });
    expect(r.category).toBe('fashion');
    expect(r.productType).toBe('shoes');
  });

  it('categorizes grocery (vegetable)', () => {
    const r = c.categorize({ title: 'Fresho Onion 1 kg' });
    expect(r.category).toBe('grocery');
    expect(r.productType).toBe('vegetable');
  });

  it('categorizes beauty (lipstick)', () => {
    const r = c.categorize({ title: 'Maybelline Lipstick Ruby Red' });
    expect(r.category).toBe('beauty');
    expect(r.productType).toBe('lipstick');
  });

  it('categorizes home (chair)', () => {
    const r = c.categorize({ title: 'Green Soul Ergonomic Office Chair' });
    expect(r.category).toBe('home');
    expect(r.productType).toBe('chair');
  });

  it('categorizes books (novel)', () => {
    const r = c.categorize({ title: 'The Alchemist - a novel (paperback)' });
    expect(r.category).toBe('books');
    // both 'book' (via paperback) and 'novel' match; novel scores 3 (exact) > book
    expect(r.productType).toBe('novel');
  });

  it('matches multi-word keywords like "graphics card"', () => {
    const r = c.categorize({ title: 'NVIDIA GeForce RTX 4060 Graphics Card' });
    expect(r.category).toBe('electronics');
    expect(r.productType).toBe('gpu');
  });

  it('uses the URL when the title is absent', () => {
    const r = c.categorize({ url: 'https://www.ajio.com/mens-running-sneakers/p/123' });
    expect(r.category).toBe('fashion');
    expect(r.productType).toBe('sneakers');
  });

  it('tolerates a single-character typo via fuzzy matching', () => {
    // "labtop" -> "laptop" is Levenshtein distance 1, both length >= 5
    const r = c.categorize({ title: 'Dell Labtop Computer' });
    expect(r.productType).toBe('laptop');
  });

  it('returns nulls for empty input', () => {
    expect(c.categorize({})).toEqual({ category: null, productType: null });
    expect(c.categorize({ title: '' })).toEqual({ category: null, productType: null });
  });

  it('returns nulls when nothing matches', () => {
    expect(c.categorize({ title: 'zxqw pldoi vbnm' })).toEqual({ category: null, productType: null });
  });

  it('does not fuzzy-match very short tokens', () => {
    // "cpu" is < 5 chars, so a near-miss like "cpx" must not match cpu.
    const r = c.categorize({ title: 'random cpx thing widget' });
    expect(r.category).toBeNull();
  });
});
