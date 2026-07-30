import { z } from 'zod';

// The scrapers service is the source of truth for supported platforms and
// performs platform detection. The API only validates the URL shape here;
// `website` is an optional hint passed through to the scrapers service.
export const NewTrackerDTO = z.object({
  url: z.string().url('Please send a valid product URL.'),
  website: z.string().optional(),
  alertPrice: z.number().positive().optional(),
  notifyEveryChange: z.boolean().optional(),
  listId: z.string().uuid().optional(),
});
