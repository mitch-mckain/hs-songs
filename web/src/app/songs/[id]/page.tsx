import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SongDetail from '@/components/SongDetail'

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [songResult, chordsResult, structureResult, roleResult] = await Promise.all([
    db.from('songs').select('*').eq('id', id).single(),
    db.from('song_chords').select('*').eq('song_id', id).order('position'),
    db.from('song_structure_rows').select('*').eq('song_id', id).order('position'),
    db.from('user_roles').select('role').eq('user_id', user.id).single(),
  ])

  if (!songResult.data) notFound()

  return (
    <SongDetail
      song={songResult.data}
      chords={chordsResult.data ?? []}
      structureRows={structureResult.data ?? []}
      role={roleResult.data?.role ?? 'viewer'}
    />
  )
}
