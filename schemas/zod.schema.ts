import { z } from 'zod';
import { SUPPORTED_SITES } from '../types/enums';

export const NewTrackerDTO = z.object({
  url: z.string().url(),
  website: z.nativeEnum(SUPPORTED_SITES, {
    errorMap: (issue, _ctx) => {
      switch (issue.code) {
        default:
          return { message: 'Please send one of these options: ' + Object.values(SUPPORTED_SITES).join(' | ') };
      }
    },
  }),
});
