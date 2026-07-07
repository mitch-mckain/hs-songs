import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SongForm from '@/components/SongForm'

export default async function NewSongPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const roleResult = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single() as unknown as { data: { role: string } | null }

  if (roleResult.data?.role !== 'editor') redirect('/')

  return <SongForm />
}
