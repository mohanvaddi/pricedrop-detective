import { extractTitle } from '../utils/extractor.utils';
import SupabaseUtils from '../utils/supabse.utils';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { Website } from '../types/main';

const supabase = new SupabaseUtils();

async function main() {
  const trackers = await supabase.fetchTrackers();
  trackers.forEach(async ({ url, website, id: hash }) => {
    const client = axios.create({});
    axiosRetry(client, { retries: 5 });
    const { data } = await client.get(url);
    const $: cheerio.CheerioAPI = cheerio.load(data);
    const title = await extractTitle(website as Website, $);

    if (title) {
      console.log('Title:: ', title);
      await supabase.client
        .from('trackers')
        .update({
          title: title.trim(),
        })
        .eq('id', hash);
    } else {
      console.error('Unable to fetch title:: ' + hash);
    }
  });
}

main().catch((error) => {
  console.error(error);
});
