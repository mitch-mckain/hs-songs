/**
 * Extract a Google Drive folder ID from a Drive URL.
 * Handles: https://drive.google.com/drive/folders/FOLDER_ID
 */
export function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match?.[1] ?? null
}

/**
 * Extract a Google Drive file ID from a Drive URL.
 */
export function extractFileId(url: string): string | null {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  return match?.[1] ?? null
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
}

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
const AUDIO_MIME_PREFIXES = ['audio/']
const GP_EXTENSIONS = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx']

export function isAudioFile(file: DriveFile): boolean {
  const nameLower = file.name.toLowerCase()
  return (
    AUDIO_MIME_PREFIXES.some(p => file.mimeType.startsWith(p)) ||
    AUDIO_EXTENSIONS.some(ext => nameLower.endsWith(ext))
  )
}

export function isGpFile(file: DriveFile): boolean {
  const nameLower = file.name.toLowerCase()
  return GP_EXTENSIONS.some(ext => nameLower.endsWith(ext))
}

/**
 * List files in a Drive folder using the Drive API v3.
 */
export async function listFolderFiles(folderId: string, accessToken: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType)',
    pageSize: '50',
  })

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) {
    throw new Error(`Drive API error: ${res.status}`)
  }

  const data = await res.json()
  return data.files ?? []
}
