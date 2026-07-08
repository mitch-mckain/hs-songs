// Chord finder logic ported from design mock

// String indices: 0 = low E, 5 = high e
const STRING_X = [10, 26.4, 42.8, 59.2, 75.6, 92]
const FRET_Y = [26, 50, 74, 98] // centers of fret cells (4 frets shown)

// Standard open-string notes (semitones, 0=C)
const STD_TUNING = [4, 9, 2, 7, 11, 4] // E A D G B e

const TUNING_MAP: Record<string, number[]> = {
  'Std':          [4, 9, 2, 7, 11, 4],
  'Eb std':       [3, 8, 1, 6, 10, 3],
  'D std':        [2, 7, 0, 5, 9, 2],
  'Drop D':       [2, 9, 2, 7, 11, 4],
  'D A D F# A D': [2, 9, 2, 6, 9, 2],
  'D A E A C# E': [2, 9, 4, 9, 1, 4],
}

// Scale degree intervals per chord type
const CHORD_INTERVALS: Record<string, number[]> = {
  major:  [0, 4, 7],
  minor:  [0, 3, 7],
  power:  [0, 7],
  '7':    [0, 4, 7, 10],
  maj7:   [0, 4, 7, 11],
  m7:     [0, 3, 7, 10],
  m7b5:   [0, 3, 6, 10],
  dim7:   [0, 3, 6, 9],
  '9':    [0, 4, 7, 10, 14],
  sus2:   [0, 2, 7],
  sus4:   [0, 5, 7],
}

const ROOT_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5,
  'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11,
}

export interface ChordShape {
  name: string
  strings: (number | 'x')[] // 6 strings, low E first
  barre: { fret: number; fromString: number; toString: number } | null
}

export interface DiagramData {
  strings: (number | 'x')[]
  barre: { fret: number; fromString: number; toString: number } | null
  isOpen: boolean
  fretLabel: string | null
  dots: { x: number; y: number }[]
  mutes: { x: number }[]
  opens: { x: number }[]
  barreRect: { x: number; y: number; width: number; height: number } | null
}

// ---- Standard tuning shapes from chords-db ----
type ChordsDB = {
  chords: Record<string, { suffix: string; positions: { frets: number[]; fingers: number[]; baseFret: number; barres: number[]; capo?: boolean }[] }[]>
}

let _guitarDb: ChordsDB | null = null
async function getGuitarDb(): Promise<ChordsDB> {
  if (_guitarDb) return _guitarDb
  // Dynamic import of the JSON
  const mod = await import('@tombatossals/chords-db/lib/guitar.json')
  _guitarDb = mod.default as unknown as ChordsDB
  return _guitarDb
}

const SUFFIX_MAP: Record<string, string> = {
  major: 'major', minor: 'minor', power: '5', '7': '7', maj7: 'maj7',
  m7: 'm7', m7b5: 'm7b5', dim7: 'dim7', '9': '9', sus2: 'sus2', sus4: 'sus4',
}

export async function getChordShapes(root: string, type: string, tuning: string): Promise<ChordShape[]> {
  const isAltTuning = !['Std', 'Eb std', 'D std'].includes(tuning)
  const isHalfStepDown = tuning === 'Eb std'
  const isFullStepDown = tuning === 'D std'

  if (type === 'power') {
    return getPowerChordShapes(root, tuning)
  }

  if (isAltTuning) {
    return getAltTuningShapes(root, type, tuning)
  }

  // Standard / uniform-downtune: use chords-db
  const db = await getGuitarDb()
  const suffix = SUFFIX_MAP[type] ?? 'major'

  // Normalize root for DB lookup
  const dbRoot = root.replace('b', 'b') // chords-db uses 'Ab', 'Bb', etc.
  const chordList = db.chords[dbRoot]
  if (!chordList) return []

  const match = chordList.find(c => c.suffix === suffix)
  if (!match) return []

  const chordName = formatChordName(root, type)

  return match.positions.slice(0, 6).map(pos => {
    // pos.frets: array of 6, -1=muted, 0=open, 1-n=fret
    const strings = pos.frets.map(f => f === -1 ? 'x' : f) as (number | 'x')[]
    const barre = pos.barres.length > 0 ? detectBarre(pos) : null
    return { name: chordName, strings, barre }
  })
}

function getPowerChordShapes(root: string, tuning: string): ChordShape[] {
  const tuningNotes = TUNING_MAP[tuning] ?? STD_TUNING
  const rootSemi = ROOT_SEMITONES[root]
  const name = `${root}5`
  const shapes: ChordShape[] = []

  // Voicing on low E string (string 0)
  for (let fret = 0; fret <= 12; fret++) {
    const note = (tuningNotes[0] + fret) % 12
    if (note === rootSemi) {
      const fifth = fret + 7 <= 12 ? fret + 7 : null
      if (fifth !== null) {
        const strings: (number | 'x')[] = ['x', 'x', 'x', 'x', 'x', 'x']
        strings[0] = fret
        strings[1] = fret + 7 > 12 ? 'x' : fret + 2  // A string: root+2 for power (E+2=A shape)
        strings[2] = fret + 2 <= 12 ? fret + 2 : 'x'  // D string
        // Actually standard power chord shape: root, fifth (2 up), octave (2 up on next string)
        // Low E power chord: E=fret, A=fret+2, D=fret+2
        const s: (number | 'x')[] = ['x', 'x', 'x', 'x', 'x', 'x']
        s[0] = fret
        s[1] = fret + 2
        s[2] = fret + 2
        shapes.push({ name, strings: s, barre: null })
      }
      break
    }
  }

  // Voicing on A string (string 1)
  for (let fret = 0; fret <= 12; fret++) {
    const note = (tuningNotes[1] + fret) % 12
    if (note === rootSemi) {
      const s: (number | 'x')[] = ['x', 'x', 'x', 'x', 'x', 'x']
      s[1] = fret
      s[2] = fret + 2
      s[3] = fret + 2
      shapes.push({ name, strings: s, barre: null })
      break
    }
  }

  // Hi voicing (octave up on low E, 12 frets higher)
  if (shapes.length > 0 && typeof shapes[0].strings[0] === 'number') {
    const baseFret = shapes[0].strings[0] as number
    if (baseFret + 12 <= 24) {
      const s: (number | 'x')[] = ['x', 'x', 'x', 'x', 'x', 'x']
      s[0] = baseFret + 12
      s[1] = baseFret + 14
      s[2] = baseFret + 14
      shapes.push({ name: `${name} (hi)`, strings: s, barre: null })
    }
  }

  return shapes
}

function getAltTuningShapes(root: string, type: string, tuning: string): ChordShape[] {
  const tuningNotes = TUNING_MAP[tuning] ?? STD_TUNING
  const rootSemi = ROOT_SEMITONES[root]
  const intervals = CHORD_INTERVALS[type] ?? CHORD_INTERVALS.major
  const chordTones = new Set(intervals.map(i => (rootSemi + i) % 12))
  const chordName = formatChordName(root, type)

  const voicings: ChordShape[] = []

  // For each starting string, find lowest playable voicing
  for (let startStr = 0; startStr <= 1; startStr++) {
    const strings: (number | 'x')[] = Array(6).fill('x')
    let valid = true
    let maxFret = 0

    for (let s = startStr; s < 6; s++) {
      let placed = false
      for (let fret = 0; fret <= 12; fret++) {
        const note = (tuningNotes[s] + fret) % 12
        if (chordTones.has(note)) {
          strings[s] = fret
          maxFret = Math.max(maxFret, fret)
          placed = true
          break
        }
      }
      if (!placed && s <= startStr + 1) { valid = false; break }
    }

    // Mute strings before startStr
    for (let s = 0; s < startStr; s++) strings[s] = 'x'

    if (valid) voicings.push({ name: chordName, strings, barre: null })
    if (voicings.length >= 4) break
  }

  return voicings
}

function detectBarre(pos: { frets: number[]; fingers: number[]; baseFret: number; barres: number[] }) {
  const barreFret = pos.barres[0]
  if (!barreFret) return null
  const absoluteFret = pos.baseFret + barreFret - 1
  const indices = pos.frets
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f === barreFret)
  if (indices.length < 2) return null
  return {
    fret: absoluteFret,
    fromString: indices[0].i,
    toString: indices[indices.length - 1].i,
  }
}

function formatChordName(root: string, type: string): string {
  const suffixes: Record<string, string> = {
    major: '', minor: 'm', power: '5', '7': '7', maj7: 'maj7',
    m7: 'm7', m7b5: 'm7♭5', dim7: 'dim7', '9': '9', sus2: 'sus2', sus4: 'sus4',
  }
  return `${root}${suffixes[type] ?? ''}`
}

// ---- Chord detection ----
const SEMITONE_TO_NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export function detectChordName(strings: (number | 'x')[], tuning: string): string | null {
  const tuningNotes = TUNING_MAP[tuning] ?? STD_TUNING
  const playedNotes: number[] = []
  strings.forEach((fret, i) => {
    if (fret !== 'x') playedNotes.push((tuningNotes[i] + (fret as number)) % 12)
  })
  if (playedNotes.length < 2) return null

  const noteSet = new Set(playedNotes)
  const uniqueNotes = [...noteSet]
  const bassNote = playedNotes[0] // lowest played string

  // Ordered root candidates: bass note first, then rest of unique notes, then all 12
  const triedRoots = new Set<number>()
  const rootOrder: number[] = [bassNote, ...uniqueNotes.filter(n => n !== bassNote)]
  for (let i = 0; i < 12; i++) if (!rootOrder.includes(i)) rootOrder.push(i)

  // Exact match: played notes == chord tones
  for (const rootSemi of rootOrder) {
    if (triedRoots.has(rootSemi)) continue
    triedRoots.add(rootSemi)
    for (const [typeName, intervals] of Object.entries(CHORD_INTERVALS)) {
      const chordTones = new Set(intervals.map(i => (rootSemi + i) % 12))
      if (
        uniqueNotes.every(n => chordTones.has(n)) &&
        [...chordTones].every(n => noteSet.has(n))
      ) {
        return formatChordName(SEMITONE_TO_NOTE[rootSemi], typeName)
      }
    }
  }

  // Partial match: best coverage score
  let best: { name: string; score: number } | null = null
  for (let rootSemi = 0; rootSemi < 12; rootSemi++) {
    for (const [typeName, intervals] of Object.entries(CHORD_INTERVALS)) {
      const chordTones = intervals.map(i => (rootSemi + i) % 12)
      const matched = uniqueNotes.filter(n => chordTones.includes(n)).length
      const extra = uniqueNotes.filter(n => !chordTones.includes(n)).length
      const score = matched / chordTones.length - extra * 0.4
      if (score >= 0.65 && (!best || score > best.score)) {
        best = { name: formatChordName(SEMITONE_TO_NOTE[rootSemi], typeName), score }
      }
    }
  }

  return best?.name ?? null
}

// ---- Diagram rendering ----
export function buildDiagramData(shape: ChordShape, size: 'small' | 'large' = 'large'): DiagramData {
  const { strings, barre } = shape

  const playedFrets = strings.filter(f => f !== 'x' && f !== 0) as number[]
  const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 0
  const maxFret = playedFrets.length > 0 ? Math.max(...playedFrets) : 0
  const hasOpenStrings = strings.some(f => f === 0)
  const isOpen = hasOpenStrings || minFret <= 1 || (barre?.fret === 1)
  const startFret = isOpen ? 1 : minFret
  const fretLabel = startFret > 1 ? String(startFret) : null

  const dots: { x: number; y: number }[] = []
  const mutes: { x: number }[] = []
  const opens: { x: number }[] = []

  strings.forEach((f, i) => {
    const x = STRING_X[i]
    if (f === 'x') {
      mutes.push({ x })
    } else if (f === 0) {
      opens.push({ x })
    } else {
      const fretNum = f as number
      const relFret = fretNum - startFret + 1 // 1-indexed within window
      if (relFret >= 1 && relFret <= 4) {
        // Skip if covered by barre (same fret, same string range)
        const coveredByBarre = barre &&
          fretNum === barre.fret &&
          i >= barre.fromString &&
          i <= barre.toString
        if (!coveredByBarre) {
          dots.push({ x, y: FRET_Y[relFret - 1] })
        }
      }
    }
  })

  let barreRect: { x: number; y: number; width: number; height: number } | null = null
  if (barre) {
    const relFret = barre.fret - startFret + 1
    if (relFret >= 1 && relFret <= 4) {
      const x1 = STRING_X[barre.fromString]
      const x2 = STRING_X[barre.toString]
      barreRect = {
        x: x1 - 9.5,
        y: FRET_Y[relFret - 1] - 9.5,
        width: x2 - x1 + 19,
        height: 19,
      }
    }
  }

  return { strings, barre, isOpen, fretLabel, dots, mutes, opens, barreRect }
}
