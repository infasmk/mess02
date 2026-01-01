import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqpsojbqpwlkdjhcjsmt.supabase.co';
const supabaseAnonKey = 'sb_publishable_t7EDwYkAayG7bEFrmwKJKg_gicRGUJn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);