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

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Fetch Google Doc content as HTML, preserving headings, bold, italic, and bullet lists.
 */
export async function fetchDocHtml(docId: string, accessToken: string): Promise<string> {
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Google Docs API error: ${res.status}`)

  const doc = await res.json()
  const parts: string[] = []
  let inList = false

  for (const element of doc.body?.content ?? []) {
    if (!element.paragraph) continue
    const style: string = element.paragraph.paragraphStyle?.namedStyleType ?? 'NORMAL_TEXT'
    const hasBullet = !!element.paragraph.bullet

    // Build inner HTML from text runs
    const inner = (element.paragraph.elements ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((el: any) => {
        const raw: string = el.textRun?.content ?? ''
        const text = raw.replace(/\n$/, '')
        if (!text) return ''
        const ts = el.textRun?.textStyle ?? {}
        let out = escapeHtml(text)
        if (ts.italic) out = `<em>${out}</em>`
        if (ts.bold) out = `<strong>${out}</strong>`
        return out
      })
      .join('')

    if (!inner.trim()) {
      if (inList) { parts.push('</ul>'); inList = false }
      continue // skip blank paragraphs
    }

    if (hasBullet) {
      if (!inList) { parts.push('<ul>'); inList = true }
      parts.push(`<li>${inner}</li>`)
    } else {
      if (inList) { parts.push('</ul>'); inList = false }
      if (style === 'TITLE') parts.push(`<h1>${inner}</h1>`)
      else if (style === 'SUBTITLE' || style === 'HEADING_1') parts.push(`<h2>${inner}</h2>`)
      else if (style === 'HEADING_2') parts.push(`<h3>${inner}</h3>`)
      else if (style === 'HEADING_3') parts.push(`<h4>${inner}</h4>`)
      else parts.push(`<p>${inner}</p>`)
    }
  }

  if (inList) parts.push('</ul>')
  return parts.join('')
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

  // Walk the document body and extract text, preserving TITLE style
  const lines: string[] = []
  for (const element of doc.body?.content ?? []) {
    if (element.paragraph) {
      const style: string = element.paragraph.paragraphStyle?.namedStyleType ?? ''
      const text = element.paragraph.elements
        ?.map((el: { textRun?: { content?: string } }) => el.textRun?.content ?? '')
        .join('') ?? ''
      // Prefix title paragraphs so the renderer can style them
      lines.push(style === 'TITLE' ? `\x02TITLE\x03${text}` : text)
    }
  }

  return lines.join('').trimEnd()
}
