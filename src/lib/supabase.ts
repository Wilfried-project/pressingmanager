import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ehgxpsywmamgsgfrvhna.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZ3hwc3l3bWFtZ3NnZnJ2aG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Nzg5MzAsImV4cCI6MjA5OTE1NDkzMH0.ICad3rKNUACqFFn-r2NEGSdp4TaHgpEM2Dph--FfwPc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})