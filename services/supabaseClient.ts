
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cqflqyyhtmtqxhszatui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZmxxeXlodG10cXhoc3phdHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTkzMzcsImV4cCI6MjA4Mzc5NTMzN30.15OMq6lC6Pkd3qUYEK14dXgKsnjczS2QCB4UIaZP_-s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
