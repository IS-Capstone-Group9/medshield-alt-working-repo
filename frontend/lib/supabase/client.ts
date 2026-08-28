import { createBrowserClient } from '@supabase/ssr'

export function isSupabaseBrowserConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  return Boolean(url && key && key.trim() !== '' && !key.includes('replace-with'))
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!isSupabaseBrowserConfigured()) {
    return null
  }

  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}
