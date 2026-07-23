import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import config from '../config';

export const supabase = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_KEY, {
  auth: { persistSession: false },
});
