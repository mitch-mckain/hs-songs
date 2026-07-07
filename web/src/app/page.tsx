import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LibraryView from '@/components/LibraryView'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [songsResult, roleResult] = await Promise.all([
    supabase
      .from('songs')
      .select('*')
      .order('last_updated', { ascending: false }),
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single() as unknown as Promise<{ data: { role: string } | null; error: unknown }>,
  ])

  const songs = songsResult.data ?? []
  const role = (roleResult.data?.role ?? 'viewer') as 'editor' | 'viewer'

  return <LibraryView songs={songs} role={role} />
}
