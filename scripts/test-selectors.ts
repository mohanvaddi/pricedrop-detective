/**
 * this script can be used to test price and title selectors for given product url and website.
 */

import TrackerUtils from '../utils/tracker.utils';
import { SUPPORTED_SITES } from '../types/enums';

async function main() {
  const tracker = new TrackerUtils();
  const resp = await tracker.createTracker(5662505850, {
    url: 'https://www.flipkart.com/apple-iphone-13-blue-128-gb/p/itm6c601e0a58b3c?pid=MOBG6VF5SMXPNQHG&lid=LSTMOBG6VF5SMXPNQHGH3DY6Z&marketplace=FLIPKART&q=iphone+13&store=tyy%2F4io&srno=s_1_1&otracker=search&otracker1=search&fm=organic&iid=a2e00f6a-6bac-4691-82ad-2b17e3526d4b.MOBG6VF5SMXPNQHG.SEARCH&ppt=None&ppn=None&ssid=5bolbfq4m80000001694545480169&qH=c68a3b83214bb235',
    website: SUPPORTED_SITES.FLIPKART,
  });

  console.log(resp);
}

main().catch((error) => {
  console.error(error);
});
