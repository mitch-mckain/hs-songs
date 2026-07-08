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
  demo:     { bg: '#FBE3B8', color: '#8A5A16', label: 'Demo' },
  released: { bg: '#DCEEBF', color: '#4C7A20', label: 'Released' },
  retired:  { bg: '#E6E1D4', color: '#6b665a', label: 'Retired' },
}

const PILL_COLORS: Record<string, { bg: string; color: string }> = {
  intro:   { bg: '#E6E1D4', color: '#6b665a' },
  verse:   { bg: '#CDECF7', color: '#1D6E8F' },
  prehook: { bg: '#FBE3B8', color: '#8A5A16' },
  chorus:  { bg: '#DCEEBF', color: '#4C7A20' },
  bridge:  { bg: '#E3DBF0', color: '#5B4A87' },
  outro:   { bg: '#E6E1D4', color: '#6b665a' },
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
      style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        borderBottom: '1px solid #17181c', paddingBottom: 10,
        marginBottom: open ? 18 : 0,
      }}
    >
      <span style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 20, color: '#17181c', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{title}</span>
      <span style={{
        fontSize: 16, color: '#17181c', fontWeight: 700, display: 'inline-block',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s', lineHeight: 1,
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

  const [notesValue, setNotesValue] = useState(song.notes ?? '')
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)

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
    <div style={{ minHeight: '100vh', background: '#FFFFF9', paddingBottom: 80 }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Back + Edit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '6px 0', fontWeight: 600, fontSize: 12, color: '#8f8f89', cursor: 'pointer', letterSpacing: '0.01em' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5"/>
            </svg>
            Song Dashboard
          </button>
          {isEditor && (
            <button
              onClick={() => router.push(`/songs/${song.id}/edit`)}
              style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 2, cursor: 'pointer', background: 'none', color: '#37352f', border: '1px solid #17181c' }}
            >
              Edit song
            </button>
          )}
        </div>

        {/* Title + status + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 'clamp(26px,7vw,38px)', color: '#17181c', letterSpacing: '-0.04em', margin: 0 }}>
              {song.title}
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1, fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 2, background: status.bg, color: status.color, border: `1px solid ${status.color}` }}>
              {status.label}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11.5, color: '#c2ab8a' }}>
            Updated {new Date(song.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderTop: '1px solid #17181c', borderLeft: '1px solid #17181c', borderBottom: '2px solid #17181c', marginBottom: 40 }}>
          {metaFields.map(f => (
            <div key={f.label} style={{ padding: '12px 14px', borderRight: '1px solid #17181c' }}>
              <div style={{ fontSize: 11, color: '#8f8f89', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5, fontWeight: 600 }}>{f.label}</div>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 600, fontSize: 17, color: '#17181c' }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* ── DEMO ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Demo" open={demoOpen} onToggle={() => setDemoOpen(o => !o)} />
          {demoOpen && (
            <div>
              {audioFile ? (
                <WaveformPlayer
                  songId={song.id}
                  songTitle={song.title}
                  fileId={audioFile.id}
                  fileName={audioFile.name}
                  logicUrl={song.logic_url ?? undefined}
                />
              ) : (
                <div>
                  {song.logic_url && (
                    <a
                      href={song.logic_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#37352f', textDecoration: 'none', border: '1px solid #17181c', borderRadius: 2, padding: '5px 10px', marginBottom: 12 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#17181c"/><path d="M8 8h8v8H8z" fill="none" stroke="#fff" strokeWidth="1.4"/></svg>
                      Logic project <span style={{ fontSize: 11, color: '#8f8f89' }}>↗</span>
                    </a>
                  )}
                  {folderError ? (
                    <div style={{ fontSize: 13, color: '#8f8f89', fontStyle: 'italic' }}>{folderError}</div>
                  ) : song.drive_folder_url ? (
                    <div style={{ fontSize: 13, color: '#8f8f89', fontStyle: 'italic' }}>Scanning Drive folder…</div>
                  ) : (
                    <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8f8f89' }}>No Drive folder linked yet — add one in Edit song.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── NOTES ── */}
        {(song.notes || isEditor) && (
          <div style={{ marginBottom: 32 }}>
            <SectionHeader title="Notes" open={notesOpen} onToggle={() => setNotesOpen(o => !o)} />
            {notesOpen && (
              notesEditing ? (
                <textarea
                  autoFocus
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                  onBlur={async () => {
                    setNotesEditing(false)
                    if (notesValue === (song.notes ?? '')) return
                    setNotesSaving(true)
                    await fetch(`/api/songs/${song.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ notes: notesValue || null }),
                    })
                    setNotesSaving(false)
                  }}
                  style={{
                    width: '100%', minHeight: 120, resize: 'vertical',
                    fontSize: 14.5, color: '#5f5e5b', lineHeight: 1.55,
                    fontFamily: 'inherit', background: '#faf7ee',
                    border: '1px solid #17181c', borderRadius: 2,
                    padding: '10px 12px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              ) : (
                <div
                  onClick={() => isEditor && setNotesEditing(true)}
                  style={{
                    fontSize: 14.5, color: notesValue ? '#5f5e5b' : '#a4917a',
                    lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    cursor: isEditor ? 'text' : 'default',
                    minHeight: isEditor ? 40 : undefined,
                    padding: isEditor ? '6px 0' : undefined,
                  }}
                >
                  {notesValue || (isEditor ? 'Click to add notes…' : '')}
                  {notesSaving && <span style={{ marginLeft: 8, fontSize: 12, color: '#a4917a' }}>Saving…</span>}
                </div>
              )
            )}
          </div>
        )}

        {/* ── STRUCTURE ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Structure" open={structureOpen} onToggle={() => setStructureOpen(o => !o)} />
          {structureOpen && (
            structureRows.length === 0 ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8f8f89' }}>No structure added yet</div>
            ) : (
              [...structureRows]
                .sort((a, b) => a.position - b.position)
                .map(row => {
                  const pill = PILL_COLORS[row.section_type] ?? PILL_COLORS.verse
                  const chordProgression = row.chord_progression as string[]
                  return (
                    <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderBottom: '1px solid #e0d8ca' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 88, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 2, background: pill.bg, color: pill.color, border: `1px solid ${pill.color}`, flex: '0 0 auto', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          {row.section_label || row.section_type}
                        </div>
                        {row.bar_count && (
                          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: '#a4917a', flex: '0 0 auto' }}>
                            ×{row.bar_count}
                          </div>
                        )}
                      </div>
                      {chordProgression.length > 0 && (
                        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 19, fontWeight: 600, color: '#37352f' }}>
                          {chordProgression.map((chord, i) => (
                            <span key={i}>
                              {i > 0 && <span style={{ margin: '0 6px', fontWeight: 400, color: '#5f5e5b' }}>→</span>}
                              {chord}
                            </span>
                          ))}
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
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Chords" open={chordsOpen} onToggle={() => setChordsOpen(o => !o)} />
          {chordsOpen && (
            chords.length === 0 ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8f8f89', paddingBottom: 8 }}>No chords added yet</div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
                  {[...chords].sort((a, b) => a.position - b.position).map(chord => {
                    const diagram = buildDiagramData({ name: chord.name, strings: chord.strings as (number | 'x')[], barre: chord.barre }, 'large')
                    return (
                      <div key={chord.id} style={{ flex: '0 0 auto', width: 96 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                          <div style={{ width: 96, height: 44, padding: '0 8px', borderRadius: 2, background: '#17181c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', overflow: 'hidden', boxSizing: 'border-box', fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 16 }}>
                            {chord.name}
                          </div>
                        </div>
                        <ChordDiagram data={diagram} size="large" />
                      </div>
                    )
                  })}
                </div>
                {song.tuning && !['Std', 'Eb std'].includes(song.tuning) && (
                  <div style={{ fontSize: 12.5, color: '#a4917a', marginBottom: 8 }}>
                    Played in {song.tuning} tuning
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* ── RIFFS & TAB ── */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Riffs & tab" open={riffsOpen} onToggle={() => setRiffsOpen(o => !o)} />
          {riffsOpen && (
            <div style={{ border: '1px solid #17181c', borderRadius: 2, padding: 16, background: '#faf7ee' }}>
              {gpFile ? (
                <AlphaTabViewer fileId={gpFile.id} title={song.title} />
              ) : song.drive_folder_url ? (
                <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8f8f89' }}>
                  No Guitar Pro file found in Drive folder. Add a .gp/.gp5/.gpx file to the folder.
                </div>
              ) : (
                <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8f8f89' }}>
                  No Drive folder linked — add one in Edit song.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── LYRICS ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #17181c', paddingBottom: 10, marginBottom: lyricsOpen ? 18 : 0, flexWrap: 'wrap' }}>
            <span
              onClick={() => setLyricsOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}
            >
              <span style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 20, color: '#17181c', textTransform: 'uppercase', letterSpacing: '0.01em' }}>Lyrics</span>
              <span style={{
                fontSize: 16, color: '#17181c', fontWeight: 700, display: 'inline-block',
                transform: lyricsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s', lineHeight: 1,
              }}>▸</span>
            </span>
            {song.lyrics_doc_url && (
              <a
                href={song.lyrics_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#37352f', textDecoration: 'none', border: '1px solid #17181c', borderRadius: 2, padding: '5px 10px', flexShrink: 0 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#4285f4"/><rect x="6" y="6" width="12" height="1.6" fill="#fff"/><rect x="6" y="10" width="12" height="1.6" fill="#fff"/><rect x="6" y="14" width="8" height="1.6" fill="#fff"/></svg>
                Lyrics doc <span style={{ fontSize: 11, color: '#8f8f89' }}>↗</span>
              </a>
            )}
          </div>
          {lyricsOpen && (
            lyricsLoading ? (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8f8f89' }}>Loading lyrics…</div>
            ) : lyricsError ? (
              <div style={{ fontSize: 13, color: '#8f8f89' }}>
                {lyricsError}
                {song.lyrics_doc_url && (
                  <> — <a href={song.lyrics_doc_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1D6E8F' }}>Open doc ↗</a></>
                )}
              </div>
            ) : lyrics ? (
              <div style={{ fontSize: 15, lineHeight: 1.8, color: '#37352f' }}>
                {lyrics.split('\n').map((line, i) => {
                  if (line.startsWith('\x02TITLE\x03')) {
                    return <div key={i} style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.3, marginBottom: 6 }}>{line.slice(7)}</div>
                  }
                  return <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{line || '\u00a0'}</div>
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8f8f89' }}>No lyrics doc linked yet</div>
            )
          )}
        </div>

      </div>
    </div>
  )
}
