/**
 * this script can be used to update titles for all the trackers.
 */

import { extractTitle, fetchPage } from '../scraper';
import { findAllTrackers } from '../db/trackers';
import { updateTrackerTitle } from '../db/trackers';
import { Platform } from '../scraper';

async function main() {
  const trackers = await findAllTrackers();
  for (const { url, website, id: hash } of trackers) {
    const $ = await fetchPage(url);
    const title = extractTitle(website as Platform, $);

    if (title) {
      console.log('Title:: ', title);
      await updateTrackerTitle(hash, title.trim());
    } else {
      console.error('Unable to fetch title:: ' + hash);
    }
  }
}

main().catch((error) => {
  console.error(error);
});
