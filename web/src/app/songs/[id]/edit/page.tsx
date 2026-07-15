import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SongForm from '@/components/SongForm'

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const roleResult = await db.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleResult.data?.role !== 'editor') redirect('/')

  const [songResult, chordsResult, structureResult] = await Promise.all([
    db.from('songs').select('*').eq('id', id).single(),
    db.from('song_chords').select('*').eq('song_id', id).order('position'),
    db.from('song_structure_rows').select('*').eq('song_id', id).order('position'),
  ])

  if (!songResult.data) notFound()

  return (
    <SongForm
      initialSong={songResult.data}
      initialChords={chordsResult.data ?? []}
      initialStructureRows={structureResult.data ?? []}
    />
  )
}
