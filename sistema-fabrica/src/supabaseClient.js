import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rifnoderpnfhsfrwygpa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpZm5vZGVycG5maHNmcnd5Z3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NjExNzgsImV4cCI6MjA2MzQzNzE3OH0.srcxrSsFU5aN38lKVmpLaW3QTyCOXzdIaPME4fpL_Q8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
