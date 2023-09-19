import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Website } from '../types/main';
import { CustomError } from '../lib/custom.error';

export async function extractData(website: Website, url: string) {
  return new Promise<{ title: string | null; currentPrice: number }>(async (resolve, reject) => {
    const client = axios.create({});
    axiosRetry(client, { retries: 5 });
    const { data } = await client.get(url);

    const $: cheerio.CheerioAPI = cheerio.load(data);

    try {
      const price = await extractPrice(website, $);
      const title = await extractTitle(website, $);
      return resolve({
        currentPrice: price,
        title: title,
      });
    } catch (error) {
      return reject(error);
    }
  });
}

export async function extractPrice(website: Website, $: cheerio.CheerioAPI) {
  const priceSelectors = {
    flipkart: [
      // if breadcrumb exists, this will work
      '#container > div > div._2c7YLP.UtUXW0._6t1WkM._3HqJxg > div._1YokD2._2GoDe3 > div._1YokD2._3Mn1Gg.col-8-12 > div:nth-child(2) > div > div > div > div > div',
      // if breadcrumb doesn't exist, this will work
      '#container > div > div._2c7YLP.UtUXW0._6t1WkM._3HqJxg > div._1YokD2._2GoDe3 > div._1YokD2._3Mn1Gg.col-8-12 > div:nth-child(1) > div > div > div > div > div',
    ],
    amazon: [
      '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center > span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay > span:nth-child(2) > span.a-price-whole',
    ],
  };

  const checkIfNumber = (str: string) => {
    return /^[0-9]*$/.test(str);
  };

  return new Promise<number>(async (resolve, reject) => {
    const selectors = priceSelectors[website];
    if (!selectors) {
      return reject(new CustomError('No selectors found', 'SelectorsNotFound'));
    }

    let price: string | null = null;

    selectors.forEach((selector) => {
      price = $(selector).html();
      if (!price) return;

      price = price.replace(/[₹$,]/g, '');
      if (!checkIfNumber(price)) {
        price = null;
        return;
      }

      return resolve(parseInt(price));
    });

    if (!price) {
      return reject(new CustomError('Unable to get price', 'PriceNotFound'));
    }
  });
}

function removeHtmlContent(input: string): string {
  // Remove HTML comments (<!-- -->)
  const withoutComments = input.replace(/<!--[\s\S]*?-->/g, '');

  // Remove HTML tags and content between angle brackets
  const withoutTags = withoutComments.replace(/<[^>]*>/g, '');

  // Remove HTML escape sequences (&nbsp;, &lt;, &gt;, &amp;, etc.)
  const withoutEscapeSequences = withoutTags.replace(/&[a-zA-Z]+;/g, '');

  return withoutEscapeSequences;
}

export async function extractTitle(website: Website, $: cheerio.CheerioAPI) {
  const titleSelector = {
    amazon: ['#productTitle'],
    flipkart: [
      '#container > div > div._2c7YLP.UtUXW0._6t1WkM._3HqJxg > div._1YokD2._2GoDe3 > div._1YokD2._3Mn1Gg.col-8-12 > div:nth-child(2) > div > div:nth-child(1) > h1 > span.B_NuCI',
      '#container > div > div._2c7YLP.UtUXW0._6t1WkM._3HqJxg > div > div._1YokD2._3Mn1Gg.col-8-12 > div:nth-child(1) > div > div:nth-child(1) > h1 > span.B_NuCI',
    ],
  };
  return new Promise<string | null>(async (resolve) => {
    const selectors = titleSelector[website];
    let title: string | null = null;

    selectors.forEach((selector) => {
      title = $(selector).html();
      if (title && title.trim() !== '') {
        resolve(removeHtmlContent(title.trim()));
      }
    });

    return resolve(null);
  });
}
