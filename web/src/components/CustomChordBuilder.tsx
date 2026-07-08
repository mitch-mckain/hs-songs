'use client'

import { useState, useMemo } from 'react'
import { detectChordName, type ChordShape } from '@/lib/chords'

// Same coordinate system as ChordDiagram — but rendered directly so dots are never clipped
const DIAG_STR_X = [10, 26.4, 42.8, 59.2, 75.6, 92]
const DIAG_FRET_Y = [26, 50, 74, 98] // 4-fret window centers

function ChordPreview({ strings }: { strings: (number | 'x')[] }) {
  const playedFrets = strings.filter(f => f !== 'x' && f !== 0) as number[]
  const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 0
  const hasOpen = strings.some(f => f === 0)
  const startFret = hasOpen || minFret <= 1 ? 1 : minFret
  const showNut = hasOpen || minFret <= 1
  const fretLabel = startFret > 1 ? String(startFret) : null

  return (
    <div style={{ position: 'relative', width: 96, height: 128 }}>
      {fretLabel && (
        <div style={{ position: 'absolute', left: -3, top: 10, fontSize: 12, color: '#9b9a97', width: 11, textAlign: 'center', zIndex: 1 }}>
          {fretLabel}
        </div>
      )}
      <svg width={96} height={128} viewBox="-8 -6 112 134" style={{ position: 'absolute', left: 0, top: 0 }}>
        {/* String lines */}
        {DIAG_STR_X.map((x, i) => (
          <line key={i} x1={x} y1="14" x2={x} y2="110"
            stroke={strings[i] === 'x' ? '#d6cfc4' : '#191a1a'} strokeWidth="1.3" />
        ))}
        {/* Nut */}
        {showNut
          ? <rect x="10" y="12" width="82" height="4" fill="#191a1a" />
          : <line x1="10" y1="14" x2="92" y2="14" stroke="#191a1a" strokeWidth="1.3" />}
        {/* Fret lines */}
        {[38, 62, 86, 110].map(y => (
          <line key={y} x1="10" y1={y} x2="92" y2={y} stroke="#191a1a" strokeWidth="1" />
        ))}
        {/* Mutes — raised to y=4 with extended viewBox so they're fully visible */}
        {DIAG_STR_X.map((x, i) => strings[i] === 'x' ? (
          <text key={i} x={x} y="4" fontSize="16" fontWeight="700" fill="#191a1a"
            textAnchor="middle" dominantBaseline="central">×</text>
        ) : null)}
        {/* Opens */}
        {DIAG_STR_X.map((x, i) => strings[i] === 0 ? (
          <circle key={i} cx={x} cy="4" r="4.5" fill="none" stroke="#191a1a" strokeWidth="1.5" />
        ) : null)}
        {/* Dots — show all within 4-fret window from startFret */}
        {strings.map((val, i) => {
          if (val === 'x' || val === 0) return null
          const relFret = (val as number) - startFret + 1
          if (relFret < 1 || relFret > 4) return null
          return <circle key={i} cx={DIAG_STR_X[i]} cy={DIAG_FRET_Y[relFret - 1]} r="9.5" fill="#191a1a" />
        })}
      </svg>
    </div>
  )
}

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e']
const STR_X = [20, 52, 84, 116, 148, 180]
const FRET_Y = [26, 58, 90, 122]   // dot centers (4 frets — matches preview)
const FRET_LINES = [42, 74, 106, 138]
const SVG_W = 200
const SVG_H = 140

interface Props {
  tuning: string
  initialStrings?: (number | 'x')[]
  initialName?: string
  submitLabel?: string
  onAdd: (chord: ChordShape) => void
  onCancel: () => void
}

const EMPTY: (number | 'x')[] = ['x', 'x', 'x', 'x', 'x', 'x']

export default function CustomChordBuilder({ tuning, initialStrings, initialName, submitLabel = 'Add chord', onAdd, onCancel }: Props) {
  const [strings, setStrings] = useState<(number | 'x')[]>(initialStrings ?? [...EMPTY])
  const [fretOffset, setFretOffset] = useState(() => {
    if (!initialStrings) return 0
    const frets = initialStrings.filter(f => f !== 'x' && f !== 0) as number[]
    return frets.length > 0 ? Math.max(0, Math.min(...frets) - 1) : 0
  })
  const [customName, setCustomName] = useState(initialName ?? '')

  const detectedName = useMemo(() => detectChordName(strings, tuning), [strings, tuning])
  const chordName = customName.trim() || detectedName || '?'
  const isEmpty = strings.every(s => s === 'x')
  const isNut = fretOffset === 0

  function toggleMute(i: number) {
    setStrings(prev => {
      const next = [...prev]
      next[i] = next[i] === 'x' ? 0 : 'x'
      return next
    })
  }

  function clickFret(strIdx: number, fret: number) {
    setStrings(prev => {
      const next = [...prev]
      next[strIdx] = next[strIdx] === fret ? 0 : fret
      return next
    })
  }

  function handleAdd() {
    if (isEmpty) return
    onAdd({ name: chordName, strings, barre: null })
    setStrings([...EMPTY])
    setCustomName('')
    setFretOffset(0)
  }

  return (
    <div style={{ border: '1px solid #17181c', borderRadius: 2, padding: 16, background: '#faf7ee' }}>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* ── Fretboard ── */}
        <div style={{ flex: '0 0 auto' }}>
          {/* String labels */}
          <div style={{ display: 'flex', paddingLeft: 20, marginBottom: 2 }}>
            {STRING_LABELS.map((label, i) => (
              <div key={i} style={{ width: 32, textAlign: 'center', fontSize: 10, color: '#8f8f89', fontWeight: 600, letterSpacing: '0.05em' }}>
                {label}
              </div>
            ))}
          </div>

          {/* Open / mute toggles */}
          <div style={{ display: 'flex', paddingLeft: 20, marginBottom: 4 }}>
            {strings.map((val, i) => (
              <button
                key={i}
                onClick={() => toggleMute(i)}
                title={val === 'x' ? 'Click to open' : 'Click to mute'}
                style={{
                  width: 32, height: 22, border: 'none', background: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0,
                  color: val === 'x' ? '#c2ab8a' : '#17181c',
                  fontFamily: 'inherit',
                }}
              >
                {val === 'x' ? '×' : '○'}
              </button>
            ))}
          </div>

          {/* Fret offset label + SVG */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ width: 16, paddingTop: FRET_Y[0] - 6, fontSize: 9, color: '#a4917a', textAlign: 'right', lineHeight: 1 }}>
              {!isNut ? fretOffset + 1 : ''}
            </div>

            <svg width={SVG_W} height={SVG_H} style={{ display: 'block', userSelect: 'none' }}>
              {/* Nut */}
              <rect
                x={STR_X[0] - 4} y={2}
                width={STR_X[5] - STR_X[0] + 8}
                height={isNut ? 5 : 2}
                fill={isNut ? '#17181c' : '#c2ab8a'}
                rx={1}
              />

              {/* String lines */}
              {STR_X.map((x, i) => (
                <line key={i} x1={x} y1={isNut ? 7 : 4} x2={x} y2={SVG_H}
                  stroke={strings[i] === 'x' ? '#e0d8ca' : '#a4917a'}
                  strokeWidth={strings[i] === 'x' ? 1 : 1.5}
                />
              ))}

              {/* Fret lines */}
              {FRET_LINES.map(y => (
                <line key={y} x1={STR_X[0] - 4} y1={y} x2={STR_X[5] + 4} y2={y}
                  stroke="#c2ab8a" strokeWidth={1}
                />
              ))}

              {/* Placed dots */}
              {strings.map((val, strIdx) => {
                if (val === 'x' || val === 0) return null
                const relFret = (val as number) - fretOffset
                if (relFret < 1 || relFret > 4) return null
                return (
                  <circle key={strIdx}
                    cx={STR_X[strIdx]} cy={FRET_Y[relFret - 1]}
                    r={11} fill="#17181c"
                  />
                )
              })}

              {/* Out-of-window indicator (small ring on string) */}
              {strings.map((val, strIdx) => {
                if (val === 'x' || val === 0) return null
                const relFret = (val as number) - fretOffset
                if (relFret >= 1 && relFret <= 4) return null
                return (
                  <circle key={`oof-${strIdx}`}
                    cx={STR_X[strIdx]} cy={6}
                    r={4} fill="none" stroke="#d0471e" strokeWidth={1.5}
                  />
                )
              })}

              {/* Click targets — one per (string × fret) cell */}
              {STR_X.flatMap((x, strIdx) =>
                FRET_Y.map((y, fretRow) => (
                  <rect
                    key={`${strIdx}-${fretRow}`}
                    x={x - 16} y={y - 16}
                    width={32} height={32}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => clickFret(strIdx, fretOffset + fretRow + 1)}
                  />
                ))
              )}
            </svg>
          </div>

          {/* Fret window navigation */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, paddingLeft: 20 }}>
            <button
              onClick={() => setFretOffset(o => Math.max(0, o - 1))}
              disabled={fretOffset === 0}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 2, border: '1px solid #c2ab8a', background: 'none', cursor: fretOffset === 0 ? 'not-allowed' : 'pointer', color: fretOffset === 0 ? '#e0d8ca' : '#5f5e5b' }}
            >↑</button>
            <button
              onClick={() => setFretOffset(o => Math.min(17, o + 1))}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 2, border: '1px solid #c2ab8a', background: 'none', cursor: 'pointer', color: '#5f5e5b' }}
            >↓</button>
            <span style={{ fontSize: 10, color: '#8f8f89' }}>
              {isNut ? `Open – fret 4` : `Frets ${fretOffset + 1}–${fretOffset + 4}`}
            </span>
          </div>
        </div>

        {/* ── Preview + name + actions ── */}
        <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 160 }}>
          <div>
            <div style={{ fontSize: 10, color: '#8f8f89', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Detected name</div>
            <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 26, color: detectedName ? '#17181c' : '#c2ab8a', lineHeight: 1, marginBottom: 10 }}>
              {customName.trim() || detectedName || '?'}
            </div>
            <div style={{ fontSize: 10, color: '#8f8f89', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Override name</div>
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={detectedName ?? 'e.g. Cadd9'}
              style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, padding: '6px 8px', border: '1px solid #17181c', borderRadius: 2, background: '#FFFFF9', color: '#37352f', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#8f8f89', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>Preview</div>
            <ChordPreview strings={strings} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdd}
              disabled={isEmpty}
              style={{
                fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 2, border: 'none',
                background: isEmpty ? '#ECE4D2' : '#17181c',
                color: isEmpty ? '#a4917a' : '#fff',
                cursor: isEmpty ? 'not-allowed' : 'pointer',
              }}
            >
              {submitLabel}
            </button>
            <button
              onClick={onCancel}
              style={{ fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 2, border: 'none', background: 'none', color: '#8f8f89', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
