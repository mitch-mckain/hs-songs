'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Song } from '@/types/database'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  demo:     { bg: '#fbf3db', color: '#946f00', label: 'Demo' },
  released: { bg: '#edf3ec', color: '#548164', label: 'Released' },
  retired:  { bg: '#f1f1ef', color: '#8a8975', label: 'Retired' },
}

const VINYL_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f1f1ef"/><circle cx="50" cy="50" r="34" fill="#dddcd8"/><circle cx="50" cy="50" r="8" fill="#f1f1ef"/></svg>`)}`

interface Props {
  songs: Song[]
  role: 'editor' | 'viewer'
}

export default function LibraryView({ songs, role }: Props) {
  const router = useRouter()
  const isEditor = role === 'editor'

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Group: demos first, then by album
  const demos = songs.filter(s => s.status === 'demo' || !s.album)
  const byAlbum: Record<string, Song[]> = {}
  songs.filter(s => s.status !== 'demo' && s.album).forEach(s => {
    const album = s.album!
    if (!byAlbum[album]) byAlbum[album] = []
    byAlbum[album].push(s)
  })

  const sections: { heading: string; songs: Song[] }[] = []
  if (demos.length) sections.push({ heading: 'Demos', songs: demos })
  Object.entries(byAlbum).forEach(([album, songs]) => sections.push({ heading: album, songs }))

  return (
    <div className="min-h-screen bg-white pb-24">
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '48px 20px 60px' }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-9 flex-wrap">
          <h1
            className="font-bold text-[#17181c]"
            style={{ fontSize: 'clamp(26px,7vw,38px)', letterSpacing: '-0.02em' }}
          >
            Heavy Sweater Resource
          </h1>
          <div className="flex items-center gap-2.5 flex-wrap">
            {isEditor && (
              <button
                onClick={() => router.push('/songs/new')}
                className="text-[13px] font-semibold px-3.5 py-2 rounded-[7px] bg-[#17181c] text-white border-none cursor-pointer"
              >
                + New song
              </button>
            )}
            <button
              onClick={signOut}
              style={{ fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 7, cursor: 'pointer', background: '#f1f1ef', color: '#9b9a97', border: 'none' }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Song sections */}
        {sections.length === 0 ? (
          <div className="text-[#9b9a97] text-sm" style={{ fontFamily: 'var(--font-mono), monospace' }}>
            No songs yet.{isEditor ? ' Add one with "+ New song".' : ''}
          </div>
        ) : (
          sections.map(section => (
            <div key={section.heading} className="mb-8">
              <div className="text-[15px] font-bold text-[#5f5e5b] mb-2.5">{section.heading}</div>
              <div style={{ borderTop: '1px solid #f1f1ef' }}>
                {section.songs.map(song => {
                  const status = STATUS_STYLES[song.status] ?? STATUS_STYLES.demo
                  return (
                    <div
                      key={song.id}
                      onClick={() => router.push(`/songs/${song.id}`)}
                      className="flex items-center gap-3.5 px-1 py-3 cursor-pointer hover:bg-[#fbfbfa] transition-colors"
                      style={{ borderBottom: '1px solid #f1f1ef' }}
                    >
                      {/* Album art */}
                      <div className="flex-none w-20 h-20">
                        <img
                          src={VINYL_PLACEHOLDER}
                          alt=""
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Play button (placeholder — wired up when audio exists) */}
                      <button
                        onClick={e => e.stopPropagation()}
                        disabled
                        className="w-9 h-9 rounded-full flex-none flex items-center justify-center text-[11px] cursor-not-allowed"
                        style={{ background: '#f1f1ef', color: '#b6b5b2', border: 'none' }}
                        title="No demo yet"
                      >
                        ▶
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[16px] text-[#17181c] truncate">{song.title}</span>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap"
                            style={{ background: status.bg, color: status.color }}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div
                          className="flex gap-3.5 text-[11.5px] text-[#9b9a97] flex-wrap mt-0.5"
                          style={{ fontFamily: 'var(--font-mono), monospace' }}
                        >
                          <span>KEY <b className="text-[#5f5e5b]">{song.key ?? '—'}</b></span>
                          <span>BPM <b className="text-[#5f5e5b]">{song.bpm ?? '—'}</b></span>
                          <span>TUNING <b className="text-[#5f5e5b]">{song.tuning}</b></span>
                        </div>
                      </div>

                      {/* Updated date */}
                      <div className="text-[11px] text-[#b6b5b2] flex-none whitespace-nowrap text-right">
                        {new Date(song.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
