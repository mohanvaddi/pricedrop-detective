import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Website } from '../types/main';

export async function extractPrice(website: Website, url: string) {
  const client = axios.create({});
  axiosRetry(client, { retries: 5 });

  const { data } = await client.get(url);

  const $ = cheerio.load(data);
  let priceText: string | null;
  switch (website) {
    case 'flipkart':
      priceText = $(
        '#container > div > div._2c7YLP.UtUXW0._6t1WkM._3HqJxg > div._1YokD2._2GoDe3 > div._1YokD2._3Mn1Gg.col-8-12 > div:nth-child(2) > div > div.dyC4hf > div.CEmiEU > div > div'
      ).html();
      break;
    case 'amazon':
      priceText = $(
        '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center > span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay > span:nth-child(2) > span.a-price-whole'
      ).html();
      break;
    default:
      throw new Error("couldn't find selector for given website");
  }

  console.log(priceText);

  if (!priceText) throw new Error('Unable to get price');
  return parseInt(priceText.replace(/[₹$,]/g, ''));
}
