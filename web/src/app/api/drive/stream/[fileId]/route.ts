import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const accessToken = session.provider_token
  if (!accessToken) return new Response('No Google access token', { status: 401 })

  // Support range requests for audio seeking
  const rangeHeader = request.headers.get('range')

  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    }
  )

  if (!driveRes.ok && driveRes.status !== 206) {
    return new Response(`Drive error: ${driveRes.status}`, { status: driveRes.status })
  }

  const headers = new Headers()
  // Forward relevant headers
  const contentType = driveRes.headers.get('content-type')
  const contentLength = driveRes.headers.get('content-length')
  const contentRange = driveRes.headers.get('content-range')
  const acceptRanges = driveRes.headers.get('accept-ranges')

  if (contentType) headers.set('content-type', contentType)
  if (contentLength) headers.set('content-length', contentLength)
  if (contentRange) headers.set('content-range', contentRange)
  if (acceptRanges) headers.set('accept-ranges', acceptRanges)
  headers.set('cache-control', 'private, max-age=3600')

  return new Response(driveRes.body, {
    status: driveRes.status,
    headers,
  })
}
