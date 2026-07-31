import { detectPlatform } from '../src/detect';

describe('detectPlatform', () => {
  it.each([
    ['https://www.amazon.in/dp/B0ABCDEFGH', 'amazon'],
    ['https://amazon.com/gp/product/B0ABCDEFGH', 'amazon'],
    ['https://amzn.in/d/abc', 'amazon'],
    ['https://www.flipkart.com/item/p/itmxyz?pid=ABC', 'flipkart'],
    ['https://www.myntra.com/shoes/nike/x/123/buy', 'myntra'],
    ['https://www.ajio.com/nike-shoes/p/123', 'ajio'],
    ['https://www.tatacliq.com/x/p-mp000', 'tatacliq'],
    ['https://www.ikea.com/in/en/p/desk-123', 'ikea'],
    ['https://www.decathlon.in/p/8326403/x', 'decathlon'],
    ['https://www.lenskart.com/x.html', 'lenskart'],
    ['https://www.meesho.com/x/p/abc', 'meesho'],
    ['https://www.nykaafashion.com/x/p/123', 'nykaafashion'],
    ['https://www.nykaa.com/x/p/123', 'nykaafashion'],
    ['https://www.croma.com/x/p/314450', 'croma'],
    ['https://www.jiomart.com/p/x/123', 'jiomart'],
    ['https://blinkit.com/prn/x/prid/123', 'blinkit'],
    ['https://www.bigbasket.com/pd/10000148/x', 'bigbasket'],
  ])('maps %s -> %s', (url, expected) => {
    expect(detectPlatform(url)).toBe(expected);
  });

  it('returns null for an unknown host', () => {
    expect(detectPlatform('https://www.example.com/product/123')).toBeNull();
  });

  it('returns null for a non-URL string', () => {
    expect(detectPlatform('not a url')).toBeNull();
    expect(detectPlatform('')).toBeNull();
  });

  it('matches host case-insensitively', () => {
    expect(detectPlatform('https://WWW.AMAZON.IN/dp/B0ABCDEFGH')).toBe('amazon');
  });
});
