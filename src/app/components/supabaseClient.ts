import { createClient } from '@supabase/supabase-js';

// Replace these with the values from your Supabase Settings -> API
const supabaseUrl = 'https://your-project-url.supabase.co';
const supabaseAnonKey = 'your-anon-key-here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);