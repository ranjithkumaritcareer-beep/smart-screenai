import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || "PASTE_YOUR_PROJECT_URL_HERE"
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "PASTE_YOUR_ANON_KEY_HERE"

// Validate URL format to prevent runtime Invalid URL initialization errors when placeholders are used
const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : "https://ikxaprrctypozoltgjro.supabase.co"
const supabaseAnonKey = rawKey !== "PASTE_YOUR_ANON_KEY_HERE" ? rawKey : "sb_publishable_B4Cv6zg4j70NmjlMCOrFhA_1w_Usizx"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
