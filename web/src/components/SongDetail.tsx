'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { buildDiagramData } from '@/lib/chords'
import ChordDiagram from '@/components/ChordDiagram'
import WaveformPlayer from '@/components/WaveformPlayer'
import dynamic from 'next/dynamic'

const AlphaTabViewer = dynamic(() => import('@/components/AlphaTabViewer'), { ssr: false })
import type { Song, SongChord, SongStructureRow } from '@/types/database'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  demo:     { bg: '#fbf3db', color: '#946f00',  label: 'Demo' },
  released: { bg: '#edf3ec', color: '#548164',  label: 'Released' },
  retired:  { bg: '#f1f1ef', color: '#8a8975',  label: 'Retired' },
}

const PILL_COLORS: Record<string, { bg: string; color: string }> = {
  intro:   { bg: '#f1f1ef', color: '#8a8975' },
  verse:   { bg: '#e7f3f8', color: '#337ea9' },
  prehook: { bg: '#f6f3f9', color: '#9065b0' },
  chorus:  { bg: '#edf3ec', color: '#548164' },
  bridge:  { bg: '#fbf3db', color: '#946f00' },
  outro:   { bg: '#f1f1ef', color: '#8a8975' },
}

interface Props {
  song: Song
  chords: SongChord[]
  structureRows: SongStructureRow[]
  role: 'editor' | 'viewer'
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: open ? 14 : 0 }}
    >
      <div style={{ fontWeight: 700, fontSize: 20, color: '#17181c' }}>{title}</div>
      <span style={{
        fontSize: 12, color: '#c9c8c4', display: 'inline-block',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s',
      }}>▸</span>
    </div>
  )
}

export default function SongDetail({ song, chords, structureRows, role }: Props) {
  const router = useRouter()
  const isEditor = role === 'editor'
  const status = STATUS_STYLES[song.status] ?? STATUS_STYLES.demo

  const [audioFile, setAudioFile] = useState<{ id: string; name: string } | null>(null)
  const [gpFile, setGpFile] = useState<{ id: string; name: string } | null>(null)
  const [folderError, setFolderError] = useState<string | null>(null)

  const [lyrics, setLyrics] = useState<string | null>(null)
  const [lyricsError, setLyricsError] = useState<string | null>(null)
  const [lyricsLoading, setLyricsLoading] = useState(false)

  const [demoOpen, setDemoOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)
  const [structureOpen, setStructureOpen] = useState(true)
  const [chordsOpen, setChordsOpen] = useState(true)
  const [riffsOpen, setRiffsOpen] = useState(true)
  const [lyricsOpen, setLyricsOpen] = useState(true)

  useEffect(() => {
    if (!song.drive_folder_url) return
    fetch(`/api/drive/folder?url=${encodeURIComponent(song.drive_folder_url)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setFolderError(data.error.includes('access token') ? 'Google session expired — sign out and sign back in to refresh it.' : data.error)
        else {
          setAudioFile(data.audioFile ?? null)
          setGpFile(data.gpFile ?? null)
        }
      })
      .catch(() => setFolderError('Failed to scan Drive folder — try signing out and back in'))
  }, [song.drive_folder_url])

  useEffect(() => {
    if (!song.lyrics_doc_url) return
    setLyricsLoading(true)
    fetch(`/api/lyrics?url=${encodeURIComponent(song.lyrics_doc_url)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setLyricsError(data.error)
        else setLyrics(data.text)
      })
      .catch(() => setLyricsError('Failed to load lyrics'))
      .finally(() => setLyricsLoading(false))
  }, [song.lyrics_doc_url])

  const metaFields = [
    { label: 'KEY',     value: song.key ?? '—' },
    { label: 'BPM',     value: song.bpm ?? '—' },
    { label: 'TIME',    value: song.time_signature ?? '—' },
    { label: 'CAPO',    value: song.capo ?? '—' },
    { label: 'TUNING',  value: song.tuning },
    { label: 'VERSION', value: song.version ?? '—' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: 80 }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Back + Edit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', padding: '6px 8px', marginLeft: -8, fontFamily: 'inherit', fontWeight: 600, fontSize: 13, color: '#9b9a97', cursor: 'pointer', borderRadius: 6 }}
          >
            ← Library
          </button>
          {isEditor && (
            <button
              onClick={() => router.push(`/songs/${song.id}/edit`)}
              style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 7, cursor: 'pointer', background: '#f1f1ef', color: '#5f5e5b', border: 'none' }}
            >
              Edit song
            </button>
          )}
        </div>

        {/* Title + status + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h1 style={{ fontWeight: 700, fontSize: 'clamp(26px,7vw,38px)', color: '#17181c', letterSpacing: '-0.01em', margin: 0 }}>
              {song.title}
            </h1>
            <span style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 11px', borderRadius: 6, background: status.bg, color: status.color }}>
              {status.label}
            </span>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: '#b6b5b2' }}>
            Updated {new Date(song.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Metadata row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 24px', padding: '18px 0', borderTop: '1px solid #f1f1ef', borderBottom: '1px solid #f1f1ef' }}>
          {metaFields.map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: '#b6b5b2', letterSpacing: '0.08em', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: 15, color: '#37352f' }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* ── DEMO ── */}
        <div style={{ paddingTop: 32 }}>
          <SectionHeader title="Demo" open={demoOpen} onToggle={() => setDemoOpen(o => !o)} />
          {demoOpen && (
            <div>
              {song.logic_url && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                  <a
                    href={song.logic_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#5f5e5b', textDecoration: 'none', border: '1px solid #ebebea', borderRadius: 6, padding: '5px 10px' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#17181c"/><path d="M8 8h8v8H8z" fill="none" stroke="#fff" strokeWidth="1.4"/></svg>
                    Logic project <span style={{ fontSize: 11, color: '#b6b5b2' }}>↗</span>
                  </a>
                </div>
              )}
              {audioFile ? (
                <WaveformPlayer
                  songId={song.id}
                  songTitle={song.title}
                  fileId={audioFile.id}
                  fileName={audioFile.name}
                />
              ) : folderError ? (
                <div style={{ fontSize: 13, color: '#c9c8c4', fontStyle: 'italic' }}>{folderError}</div>
              ) : song.drive_folder_url ? (
                <div style={{ fontSize: 13, color: '#c9c8c4', fontStyle: 'italic' }}>Scanning Drive folder…</div>
              ) : (
                <div style={{ fontSize: 13, fontStyle: 'italic', color: '#c9c8c4' }}>No Drive folder linked yet — add one in Edit song.</div>
              )}
            </div>
          )}
        </div>

        {/* ── NOTES ── */}
        {song.notes && (
          <div style={{ paddingTop: 32 }}>
            <SectionHeader title="Notes" open={notesOpen} onToggle={() => setNotesOpen(o => !o)} />
            {notesOpen && (
              <div style={{ fontSize: 14.5, color: '#5f5e5b', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {song.notes}
              </div>
            )}
          </div>
        )}

        {/* ── STRUCTURE ── */}
        <div style={{ paddingTop: 32 }}>
          <SectionHeader title="Structure" open={structureOpen} onToggle={() => setStructureOpen(o => !o)} />
          {structureOpen && (
            structureRows.length === 0 ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#c9c8c4' }}>No structure added yet</div>
            ) : (
              [...structureRows]
                .sort((a, b) => a.position - b.position)
                .map(row => {
                  const pill = PILL_COLORS[row.section_type] ?? PILL_COLORS.verse
                  const chordNames = (row.chord_progression as string[]).join(' → ')
                  return (
                    <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderBottom: '1px solid #f1f1ef' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 88, textAlign: 'center', fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 6, background: pill.bg, color: pill.color, flex: '0 0 auto' }}>
                          {row.section_label || row.section_type}
                        </div>
                        {row.bar_count && (
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#b6b5b2', flex: '0 0 auto' }}>
                            ×{row.bar_count}
                          </div>
                        )}
                      </div>
                      {chordNames && (
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 19, fontWeight: 600, color: '#37352f' }}>
                          {chordNames}
                        </div>
                      )}
                      {row.lyric_snippet && (
                        <div style={{ fontSize: 14.5, color: '#5f5e5b' }}>{row.lyric_snippet}</div>
                      )}
                    </div>
                  )
                })
            )
          )}
        </div>

        {/* ── CHORDS ── */}
        <div style={{ paddingTop: 32 }}>
          <SectionHeader title="Chords" open={chordsOpen} onToggle={() => setChordsOpen(o => !o)} />
          {chordsOpen && (
            chords.length === 0 ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#c9c8c4', paddingBottom: 8 }}>No chords added yet</div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
                  {[...chords].sort((a, b) => a.position - b.position).map(chord => {
                    const diagram = buildDiagramData({ name: chord.name, strings: chord.strings as (number | 'x')[], barre: chord.barre }, 'large')
                    return (
                      <div key={chord.id} style={{ flex: '0 0 auto', width: 96 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                          <div style={{ width: 96, height: 44, padding: '0 8px', borderRadius: 12, background: '#191a1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', overflow: 'hidden', boxSizing: 'border-box', fontWeight: 700, fontSize: 16 }}>
                            {chord.name}
                          </div>
                        </div>
                        <ChordDiagram data={diagram} size="large" />
                      </div>
                    )
                  })}
                </div>
                {song.tuning && !['Std', 'Eb std'].includes(song.tuning) && (
                  <div style={{ fontSize: 12.5, color: '#b6b5b2', marginBottom: 8 }}>
                    Played in {song.tuning} tuning
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* ── RIFFS & TAB ── */}
        <div style={{ paddingTop: 32 }}>
          <SectionHeader title="Riffs & tab" open={riffsOpen} onToggle={() => setRiffsOpen(o => !o)} />
          {riffsOpen && (
            <div style={{ border: '1px solid #ebebea', borderRadius: 10, padding: 16, background: '#fbfbfa' }}>
              {gpFile ? (
                <AlphaTabViewer fileId={gpFile.id} title={song.title} />
              ) : song.drive_folder_url ? (
                <div style={{ fontSize: 13, fontStyle: 'italic', color: '#c9c8c4' }}>
                  No Guitar Pro file found in Drive folder. Add a .gp/.gp5/.gpx file to the folder.
                </div>
              ) : (
                <div style={{ fontSize: 13, fontStyle: 'italic', color: '#c9c8c4' }}>
                  No Drive folder linked — add one in Edit song.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── LYRICS ── */}
        <div style={{ paddingTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: lyricsOpen ? 14 : 0, flexWrap: 'wrap' }}>
            <SectionHeader title="Lyrics" open={lyricsOpen} onToggle={() => setLyricsOpen(o => !o)} />
            {song.lyrics_doc_url && (
              <a
                href={song.lyrics_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#5f5e5b', textDecoration: 'none', border: '1px solid #ebebea', borderRadius: 6, padding: '5px 10px' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#4285f4"/><rect x="6" y="6" width="12" height="1.6" fill="#fff"/><rect x="6" y="10" width="12" height="1.6" fill="#fff"/><rect x="6" y="14" width="8" height="1.6" fill="#fff"/></svg>
                Lyrics doc <span style={{ fontSize: 11, color: '#b6b5b2' }}>↗</span>
              </a>
            )}
          </div>
          {lyricsOpen && (
            lyricsLoading ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#c9c8c4' }}>Loading lyrics…</div>
            ) : lyricsError ? (
              <div style={{ fontSize: 13, color: '#c9c8c4' }}>
                {lyricsError}
                {song.lyrics_doc_url && (
                  <> — <a href={song.lyrics_doc_url} target="_blank" rel="noopener noreferrer" style={{ color: '#337ea9' }}>Open doc ↗</a></>
                )}
              </div>
            ) : lyrics ? (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.8, color: '#37352f' }}>
                {lyrics}
              </div>
            ) : (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#c9c8c4' }}>No lyrics doc linked yet</div>
            )
          )}
        </div>

      </div>
    </div>
  )
}

function GoogleDriveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 87.3 78" style={{ flex: '0 0 auto' }}>
      <path fill="#0066da" d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/>
      <path fill="#00ac47" d="M43.65 25l-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"/>
      <path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"/>
      <path fill="#00832d" d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"/>
      <path fill="#2684fc" d="M59.7 53h-27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h45.5c1.6 0 3.15-.45 4.5-1.2z"/>
      <path fill="#ffba00" d="M73.4 27.3l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 13.75 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z"/>
    </svg>
  )
}
