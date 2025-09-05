import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://locgdlmrnzoxktueskfn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2dkbG1ybnpveGt0dWVza2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjQ5NTgsImV4cCI6MjA3MjI0MDk1OH0.9Tzbn2gQekeFKNv2gGpPsCyFMKX7lENC7gRfmDHnrrQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  }
});
