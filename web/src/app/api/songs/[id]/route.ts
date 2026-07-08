import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  const { error } = await db
    .from('songs')
    .update({ ...body, updated_by: user.id, last_updated: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // Update song
  const { error: songError } = await db
    .from('songs')
    .update({
      title: song.title,
      status: song.status,
      album: song.album || null,
      key: song.key || null,
      bpm: song.bpm || null,
      time_signature: song.time_signature || null,
      capo: song.capo || null,
      version: song.version || null,
      tuning: song.tuning,
      drive_folder_url: song.drive_folder_url || null,
      logic_url: song.logic_url || null,
      lyrics_doc_url: song.lyrics_doc_url || null,
      notes: song.notes || null,
      updated_by: user.id,
      last_updated: new Date().toISOString(),
    })
    .eq('id', id)

  if (songError) {
    return NextResponse.json({ error: songError.message }, { status: 500 })
  }

  // Replace chords: delete all then re-insert
  await db.from('song_chords').delete().eq('song_id', id)
  if (chords.length > 0) {
    await db.from('song_chords').insert(
      chords.map((c: { id?: string; name: string; strings: (number | 'x')[]; barre: unknown }, i: number) => ({
        ...(c.id ? { id: c.id } : {}),
        song_id: id,
        position: i,
        name: c.name,
        tuning: song.tuning,
        strings: c.strings,
        barre: c.barre ?? null,
      }))
    )
  }

  // Replace structure rows
  await db.from('song_structure_rows').delete().eq('song_id', id)
  if (structureRows.length > 0) {
    await db.from('song_structure_rows').insert(
      structureRows.map((r: { section_label: string; section_type: string; bar_count: number | null; lyric_snippet: string; chord_progression: string[] }, i: number) => ({
        song_id: id,
        position: i,
        section_label: r.section_label,
        section_type: r.section_type,
        bar_count: r.bar_count ?? null,
        lyric_snippet: r.lyric_snippet || null,
        chord_progression: r.chord_progression,
      }))
    )
  }

  return NextResponse.json({ id })
}
