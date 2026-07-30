/**
 * this script can be used to update titles for all the active products.
 */

import { extractTitle, fetchPage } from '../src/scraper';
import { findAllActiveProducts, updateProductTitle } from '@pricedrop/shared/db/products';
import { Platform } from '../src/scraper';

async function main() {
  const products = await findAllActiveProducts();
  for (const { url, website, id: hash } of products) {
    const $ = await fetchPage(website as Platform, url);
    const title = extractTitle(website as Platform, $);

    if (title) {
      console.log('Title:: ', title);
      await updateProductTitle(hash, title.trim());
    } else {
      console.error('Unable to fetch title:: ' + hash);
    }
  }
}

main().catch((error) => {
  console.error(error);
});
