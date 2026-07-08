import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SONG_ID = '38672fd4-76c2-42b9-8d82-c7f8aab7fb73'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  // Fetch existing song to preserve metadata
  const { data: song } = await db.from('songs').select('*').eq('id', SONG_ID).single()
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 })

  const chords = [
    { id: crypto.randomUUID(), name: 'C#5', strings: ['x', 5, 7, 7, 'x', 'x'], barre: null }, // D  → C#
    { id: crypto.randomUUID(), name: 'C5',  strings: ['x', 4, 7, 7, 'x', 'x'], barre: null }, // C# → C  (low)
    { id: crypto.randomUUID(), name: 'Bb5', strings: ['x', 2, 4, 4, 'x', 'x'], barre: null }, // B  → Bb
    { id: crypto.randomUUID(), name: 'Ab5', strings: [5, 7, 7, 'x', 'x', 'x'],  barre: null }, // A  → Ab
    { id: crypto.randomUUID(), name: 'F#5', strings: [3, 5, 5, 'x', 'x', 'x'],  barre: null }, // G  → F#
    { id: crypto.randomUUID(), name: 'F5',  strings: [2, 4, 4, 'x', 'x', 'x'],  barre: null }, // F# → F
    { id: crypto.randomUUID(), name: 'Bb5', strings: [7, 9, 9, 'x', 'x', 'x'],  barre: null }, // B  → Bb (high)
    { id: crypto.randomUUID(), name: 'C5',  strings: [6, 8, 8, 'x', 'x', 'x'],  barre: null }, // C# → C  (high)
    { id: crypto.randomUUID(), name: 'Eb5', strings: [0, 2, 2, 'x', 'x', 'x'],  barre: null }, // E  → Eb
  ]

  const [CS5, C5, BB5, AB5, FS5, F5, BB5H, C5H, EB5] = chords.map(c => c.id)

  const structureRows = [
    { section_label: 'Verse',  section_type: 'verse',  bar_count: 2, lyric_snippet: null,                             chord_progression: [CS5, C5, BB5, AB5, FS5] },
    { section_label: 'Chorus', section_type: 'chorus', bar_count: 2, lyric_snippet: 'Your scrambling for tact...',    chord_progression: [F5, FS5, CS5, C5, BB5, AB5] },
    { section_label: 'Bridge', section_type: 'bridge', bar_count: 2, lyric_snippet: 'What the hell am I doing...',    chord_progression: [BB5H, C5H, FS5, EB5, F5, AB5] },
    { section_label: 'Outro',  section_type: 'outro',  bar_count: 2, lyric_snippet: 'Your never got to know me...',   chord_progression: [CS5, F5, FS5, AB5] },
  ]

  // Replace chords
  await db.from('song_chords').delete().eq('song_id', SONG_ID)
  await db.from('song_chords').insert(
    chords.map((c, i) => ({ id: c.id, song_id: SONG_ID, position: i, name: c.name, tuning: song.tuning, strings: c.strings, barre: c.barre }))
  )

  // Replace structure
  await db.from('song_structure_rows').delete().eq('song_id', SONG_ID)
  await db.from('song_structure_rows').insert(
    structureRows.map((r, i) => ({ song_id: SONG_ID, position: i, ...r }))
  )

  // Touch last_updated
  await db.from('songs').update({ last_updated: new Date().toISOString() }).eq('id', SONG_ID)

  return NextResponse.json({ ok: true, chords: chords.length, structure: structureRows.length })
}
