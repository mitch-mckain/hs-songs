import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleResult = await db.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleResult.data?.role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { song, chords, structureRows } = body

  const { data: newSong, error: songError } = await db
    .from('songs')
    .insert({
      title: song.title,
      status: song.status,
      album: song.album || null,
      key: song.key || null,
      bpm: song.bpm || null,
      capo: song.capo || null,
      tuning: song.tuning,
      time_signature: song.time_signature || null,
      version: song.version || null,
      drive_folder_url: song.drive_folder_url || null,
      practice_folder_url: song.practice_folder_url || null,
      logic_url: song.logic_url || null,
      lyrics_doc_url: song.lyrics_doc_url || null,
      notes: song.notes || null,
      created_by: user.id,
      updated_by: user.id,
      last_updated: new Date().toISOString(),
    })
    .select()
    .single()

  if (songError || !newSong) {
    return NextResponse.json({ error: songError?.message ?? 'Failed to save song' }, { status: 500 })
  }

  if (chords.length > 0) {
    await db.from('song_chords').insert(
      chords.map((c: { id?: string; name: string; strings: (number | 'x')[]; barre: unknown }, i: number) => ({
        ...(c.id ? { id: c.id } : {}),
        song_id: newSong.id,
        position: i,
        name: c.name,
        tuning: song.tuning,
        strings: c.strings,
        barre: c.barre ?? null,
      }))
    )
  }

  if (structureRows.length > 0) {
    await db.from('song_structure_rows').insert(
      structureRows.map((r: { section_label: string; section_type: string; bar_count: number | null; lyric_snippet: string; chord_progression: string[] }, i: number) => ({
        song_id: newSong.id,
        position: i,
        section_label: r.section_label,
        section_type: r.section_type,
        bar_count: r.bar_count ?? null,
        lyric_snippet: r.lyric_snippet || null,
        chord_progression: r.chord_progression,
      }))
    )
  }

  return NextResponse.json({ id: newSong.id })
}
