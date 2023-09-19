import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Website } from '../types/main';
import { CustomError } from '../lib/custom.error';

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

export async function extractPrice(website: Website, url: string) {
  return new Promise<number>(async (resolve, reject) => {
    const client = axios.create({});
    axiosRetry(client, { retries: 5 });
    const { data } = await client.get(url);

    const $: cheerio.CheerioAPI = cheerio.load(data);
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

export async function extractTitle(website: Website, url: string) {
  const titleSelector = {
    amazon: '#productTitle',
    flipkart:
      '#container > div > div._2c7YLP.UtUXW0._6t1WkM._3HqJxg > div._1YokD2._2GoDe3 > div._1YokD2._3Mn1Gg.col-8-12 > div:nth-child(2) > div > div:nth-child(1) > h1 > span',
  };

  return new Promise<string>(async (resolve, reject) => {
    const client = axios.create({});
    axiosRetry(client, { retries: 5 });
    const { data } = await client.get(url);

    const $: cheerio.CheerioAPI = cheerio.load(data);
    const title = $(titleSelector[website]).html();
    if (!title) {
      return reject(new CustomError('Unable to get title', 'TitleNotFound'));
    }

    return resolve(title);
  });
}
