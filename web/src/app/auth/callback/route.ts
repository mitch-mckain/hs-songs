import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_EMAILS = [
  'hvyswtr@gmail.com',
  'mitch.r.mckain@gmail.com',
  'nippert.lukas@gmail.com',
  'david.adam.zimmer@gmail.com',
  'ezrasherman5@gmail.com',
]

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()

    if (user && !ALLOWED_EMAILS.includes(user.email ?? '')) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=unauthorized`)
    }
  }

  const next = searchParams.get('next') ?? '/'
  return NextResponse.redirect(`${origin}${next}`)
}
