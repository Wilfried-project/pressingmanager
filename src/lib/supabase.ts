import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cyzfkwbjrcxwejzpioja.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5emZrd2JqcmN4d2VqenBpb2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTY5ODQsImV4cCI6MjA5ODM5Mjk4NH0.5KH-wpibqzcfk--Oe9EE9QMKKfc8h-DxYn9aH_i4_f0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})