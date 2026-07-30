type ProductTypeKeywords = Record<string, readonly string[]>;
type CategoryKeywords = Record<string, ProductTypeKeywords>;

/**
 * Keyword dictionary used by ProductCategorizer.
 *
 * To extend categorization, add lowercase keywords under an existing product type,
 * or add a new product type under the relevant category. Re-run
 * `npx tsx scrapers/scripts/recategorize.ts` after changing keywords.
 */
export const CATEGORY_KEYWORDS: CategoryKeywords = {
  electronics: {
    phone: ['phone', 'mobile', 'smartphone', 'iphone', 'android', 'galaxy', 'redmi', 'realme', 'oneplus', 'pixel'],
    laptop: ['laptop', 'notebook', 'macbook', 'thinkpad', 'vivobook', 'ideapad', 'chromebook'],
    cpu: ['cpu', 'processor', 'intel', 'ryzen', 'core i3', 'core i5', 'core i7', 'core i9'],
    gpu: ['gpu', 'graphics card', 'geforce', 'rtx', 'gtx', 'radeon'],
    ram: ['ram', 'memory', 'ddr4', 'ddr5', 'sodimm'],
    motherboard: ['motherboard', 'mainboard', 'b450', 'b550', 'x570', 'z790'],
    monitor: ['monitor', 'display', 'gaming monitor', 'led monitor', 'lcd monitor'],
    keyboard: ['keyboard', 'mechanical keyboard', 'wireless keyboard'],
    mouse: ['mouse', 'gaming mouse', 'wireless mouse'],
    headphone: ['headphone', 'headphones', 'headset'],
    earbuds: ['earbuds', 'ear buds', 'earphones', 'tws', 'airpods'],
    television: ['television', 'tv', 'smart tv', 'oled', 'qled'],
    camera: ['camera', 'dslr', 'mirrorless', 'gopro', 'webcam'],
    tablet: ['tablet', 'ipad', 'galaxy tab'],
    smartwatch: ['smartwatch', 'smart watch', 'fitness band', 'wearable'],
    charger: ['charger', 'adapter', 'charging cable', 'usb cable', 'type c'],
    powerbank: ['powerbank', 'power bank', 'battery pack'],
    ssd: ['ssd', 'solid state drive', 'nvme'],
    harddrive: ['harddrive', 'hard drive', 'hdd', 'external drive'],
    router: ['router', 'wifi router', 'wi-fi router', 'modem'],
  },
  fashion: {
    shirt: ['shirt', 'formal shirt', 'casual shirt'],
    tshirt: ['tshirt', 't-shirt', 'tee', 'polo'],
    pants: ['pants', 'trouser', 'trousers'],
    jeans: ['jeans', 'denim'],
    dress: ['dress', 'gown', 'frock'],
    shoes: ['shoes', 'shoe', 'footwear'],
    sneakers: ['sneakers', 'sneaker', 'trainers'],
    sandals: ['sandals', 'sandal', 'flip flop', 'slipper'],
    jacket: ['jacket', 'coat', 'hoodie', 'sweatshirt'],
    saree: ['saree', 'sari'],
    kurta: ['kurta', 'kurti'],
    watch: ['watch', 'wrist watch', 'analog watch'],
    sunglasses: ['sunglasses', 'sun glasses', 'eyewear'],
    bag: ['bag', 'backpack', 'handbag', 'sling bag'],
    wallet: ['wallet', 'card holder'],
    belt: ['belt', 'waist belt'],
  },
  books: {
    book: ['book', 'paperback', 'hardcover', 'kindle'],
    novel: ['novel', 'fiction'],
    textbook: ['textbook', 'text book', 'guidebook', 'exam guide'],
    comic: ['comic', 'manga', 'graphic novel'],
    magazine: ['magazine', 'journal'],
  },
  grocery: {
    vegetable: ['vegetable', 'vegetables', 'potato', 'tomato', 'onion'],
    fruit: ['fruit', 'fruits', 'apple', 'banana', 'mango', 'orange'],
    snack: ['snack', 'snacks', 'chips', 'namkeen', 'biscuit', 'cookies'],
    beverage: ['beverage', 'drink', 'juice', 'tea', 'coffee', 'cola'],
    dairy: ['dairy', 'milk', 'cheese', 'butter', 'curd', 'yogurt'],
    staple: ['staple', 'rice', 'atta', 'flour', 'dal', 'pulses', 'oil'],
    spice: ['spice', 'spices', 'masala', 'turmeric', 'chilli', 'pepper'],
    household: ['household', 'detergent', 'cleaner', 'soap', 'tissue'],
  },
  beauty: {
    lipstick: ['lipstick', 'lip color', 'lipcolour'],
    foundation: ['foundation', 'concealer', 'compact'],
    moisturizer: ['moisturizer', 'moisturiser', 'cream', 'lotion'],
    shampoo: ['shampoo', 'conditioner', 'hair cleanser'],
    perfume: ['perfume', 'fragrance', 'deodorant', 'body spray'],
    serum: ['serum', 'face serum', 'hair serum'],
  },
  home: {
    furniture: ['furniture', 'cabinet', 'wardrobe', 'shelf', 'table'],
    desk: ['desk', 'study table', 'computer table'],
    chair: ['chair', 'office chair', 'gaming chair'],
    sofa: ['sofa', 'couch', 'sectional'],
    mattress: ['mattress', 'bed', 'pillow'],
    cookware: ['cookware', 'pan', 'kadai', 'tawa', 'pressure cooker'],
    lighting: ['lighting', 'lamp', 'light', 'bulb', 'led strip'],
  },
} as const;

export type CategorizationResult = {
  category: string | null;
  productType: string | null;
};

export type CategorizationInput = {
  title?: string | null;
  url?: string | null;
  website?: string | null;
};

export class ProductCategorizer {
  public categorize(input: CategorizationInput): CategorizationResult {
    const normalizedText = this.normalizeText([input.title, input.url].filter((value): value is string => Boolean(value)).join(' '));
    const tokens = this.tokenize(normalizedText);

    if (tokens.length === 0) {
      return { category: null, productType: null };
    }

    let bestCategory: string | null = null;
    let bestProductType: string | null = null;
    let bestCategoryScore = 0;
    let bestProductTypeScore = 0;

    for (const category of Object.keys(CATEGORY_KEYWORDS)) {
      const productTypes = CATEGORY_KEYWORDS[category];
      if (!productTypes) {
        continue;
      }
      let categoryScore = 0;
      let categoryBestProductType: string | null = null;
      let categoryBestProductTypeScore = 0;

      for (const productType of Object.keys(productTypes)) {
        const keywords = productTypes[productType];
        if (!keywords) {
          continue;
        }
        let productTypeScore = this.keywordMatches(productType, normalizedText, tokens) ? 3 : 0;

        for (const keyword of keywords) {
          if (this.keywordMatches(keyword, normalizedText, tokens)) {
            productTypeScore += keyword === productType ? 3 : 1;
          }
        }

        if (productTypeScore > 0) {
          categoryScore += productTypeScore;
        }

        if (productTypeScore > categoryBestProductTypeScore) {
          categoryBestProductType = productType;
          categoryBestProductTypeScore = productTypeScore;
        }
      }

      if (categoryScore > bestCategoryScore || (categoryScore === bestCategoryScore && categoryBestProductTypeScore > bestProductTypeScore)) {
        bestCategory = category;
        bestProductType = categoryBestProductType;
        bestCategoryScore = categoryScore;
        bestProductTypeScore = categoryBestProductTypeScore;
      }
    }

    if (bestCategoryScore === 0) {
      return { category: null, productType: null };
    }

    return { category: bestCategory, productType: bestProductType };
  }

  private keywordMatches(keyword: string, normalizedText: string, tokens: readonly string[]): boolean {
    const normalizedKeyword = this.normalizeText(keyword);
    if (!normalizedKeyword) {
      return false;
    }

    if (normalizedKeyword.includes(' ') && normalizedText.includes(normalizedKeyword)) {
      return true;
    }

    const keywordTokens = this.tokenize(normalizedKeyword);
    if (keywordTokens.length === 0) {
      return false;
    }

    return keywordTokens.every((keywordToken) => tokens.some((token) => this.tokenMatchesKeyword(token, keywordToken)));
  }

  private tokenMatchesKeyword(token: string, keywordToken: string): boolean {
    if (token === keywordToken || (keywordToken.length >= 5 && token.includes(keywordToken))) {
      return true;
    }

    return (
      keywordToken.length >= 5 &&
      token.length >= 5 &&
      Math.abs(token.length - keywordToken.length) <= 1 &&
      this.levenshteinDistance(token, keywordToken) <= 1
    );
  }

  private normalizeText(text: string): string {
    const decoded = this.decodeSafely(text);
    return decoded
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    return text.split(' ').filter((token) => token.length >= 2);
  }

  private decodeSafely(text: string): string {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  }

  private levenshteinDistance(a: string, b: string): number {
    const previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i += 1) {
      const currentRow = [i];
      const aChar = a[i - 1];

      for (let j = 1; j <= b.length; j += 1) {
        const bChar = b[j - 1];
        const substitutionCost = aChar === bChar ? 0 : 1;
        const insertion = currentRow[j - 1]! + 1;
        const deletion = previousRow[j]! + 1;
        const substitution = previousRow[j - 1]! + substitutionCost;
        currentRow[j] = Math.min(insertion, deletion, substitution);
      }

      for (let j = 0; j < currentRow.length; j += 1) {
        previousRow[j] = currentRow[j]!;
      }
    }

    return previousRow[b.length]!;
  }
}
