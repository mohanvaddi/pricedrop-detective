import { ProductCategorizer } from '../src/categorizer';
import { findUncategorizedProducts, updateProductCategory } from '@pricedrop/shared/db/products';

async function main() {
  const products = await findUncategorizedProducts();
  const categorizer = new ProductCategorizer();
  let categorized = 0;
  let uncategorized = 0;

  for (const product of products) {
    const result = categorizer.categorize({ title: product.title, url: product.url, website: product.website });

    if (result.category) {
      await updateProductCategory(product.id, result.category, result.productType);
      categorized += 1;
    } else {
      uncategorized += 1;
    }
  }

  console.log(`Recategorization complete: ${categorized} categorized, ${uncategorized} still uncategorized.`);
}

main().catch((error) => {
  console.error(error);
});
