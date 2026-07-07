/**
 * Extract a Google Doc ID from a docs.google.com URL.
 * Handles formats:
 *   https://docs.google.com/document/d/DOC_ID/edit
 *   https://docs.google.com/document/d/DOC_ID/pub
 */
export function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  return match?.[1] ?? null
}

/**
 * Fetch plain text content from a Google Doc using the Docs REST API.
 * Requires a valid OAuth access token with documents.readonly scope.
 */
export async function fetchDocText(docId: string, accessToken: string): Promise<string> {
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) {
    throw new Error(`Google Docs API error: ${res.status}`)
  }

  const doc = await res.json()

  // Walk the document body and extract plain text
  const lines: string[] = []
  for (const element of doc.body?.content ?? []) {
    if (element.paragraph) {
      const text = element.paragraph.elements
        ?.map((el: { textRun?: { content?: string } }) => el.textRun?.content ?? '')
        .join('') ?? ''
      lines.push(text)
    }
  }

  return lines.join('').trimEnd()
}
