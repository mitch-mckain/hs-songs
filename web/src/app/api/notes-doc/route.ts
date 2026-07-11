import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractDocId, fetchDocHtml } from '@/lib/google'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const docUrl = searchParams.get('url')
  if (!docUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const docId = extractDocId(docUrl)
  if (!docId) return NextResponse.json({ error: 'Invalid Google Docs URL' }, { status: 400 })

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = session.provider_token
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token — please sign out and sign in again' }, { status: 401 })
  }

  try {
    const html = await fetchDocHtml(docId, accessToken)
    return NextResponse.json({ html })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
