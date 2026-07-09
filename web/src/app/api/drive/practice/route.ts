import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractFolderId, listFolderFiles, isAudioFile } from '@/lib/drive'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folderUrl = searchParams.get('url')
  if (!folderUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const folderId = extractFolderId(folderUrl)
  if (!folderId) return NextResponse.json({ error: 'Invalid Drive folder URL' }, { status: 400 })

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = session.provider_token
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token — please sign out and sign in again' }, { status: 401 })
  }

  try {
    const files = await listFolderFiles(folderId, accessToken)
    const audioFiles = files
      .filter(isAudioFile)
      .sort((a, b) => b.name.localeCompare(a.name)) // newest first (assumes date-prefixed names)
      .map(f => ({ id: f.id, name: f.name }))

    return NextResponse.json({ audioFiles })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list folder'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
