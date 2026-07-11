import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractFolderId, listFolderFiles, isAudioFile, isGpFile, isLogicFile, isLyricsDoc, isNotesDoc, isPracticeFolder } from '@/lib/drive'

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
    const audioFile = files.find(isAudioFile) ?? null
    const gpFile = files.find(isGpFile) ?? null
    const logicFile = files.find(isLogicFile) ?? null
    const docFile = files.find(isLyricsDoc) ?? null
    const notesDocFile = files.find(isNotesDoc) ?? null
    const practiceFolder = files.find(isPracticeFolder) ?? null

    // Scan practice subfolder for audio files if found
    let practiceFiles: { id: string; name: string }[] = []
    if (practiceFolder) {
      const practiceItems = await listFolderFiles(practiceFolder.id, accessToken)
      practiceFiles = practiceItems
        .filter(isAudioFile)
        .sort((a, b) => b.name.localeCompare(a.name))
        .map(f => ({ id: f.id, name: f.name }))
    }

    return NextResponse.json({
      audioFile: audioFile ? { id: audioFile.id, name: audioFile.name } : null,
      gpFile: gpFile ? { id: gpFile.id, name: gpFile.name } : null,
      logicFile: logicFile ? {
        id: logicFile.id,
        name: logicFile.name,
        url: `https://drive.google.com/file/d/${logicFile.id}/view`,
      } : null,
      docFile: docFile ? {
        id: docFile.id,
        name: docFile.name,
        url: `https://docs.google.com/document/d/${docFile.id}/edit`,
      } : null,
      notesDocFile: notesDocFile ? {
        id: notesDocFile.id,
        name: notesDocFile.name,
        url: `https://docs.google.com/document/d/${notesDocFile.id}/edit`,
      } : null,
      practiceFiles,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list folder'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
