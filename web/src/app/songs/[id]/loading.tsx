export default function SongLoading() {
  const sk = (w: string | number, h: number, r = 4) => (
    <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flexShrink: 0 }} />
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fbfaf7', paddingBottom: 80 }}>
      <div className="detail-container" style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Back + Edit row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ece8df' }} />
          <div style={{ width: 80, height: 32, borderRadius: 8, background: '#ece8df' }} />
        </div>

        {/* Title */}
        <div style={{ marginBottom: 6 }}>{sk('55%', 34, 4)}</div>
        {/* Artist */}
        <div style={{ marginBottom: 24 }}>{sk('30%', 18, 4)}</div>

        {/* Status + BPM row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {sk(60, 24, 20)}
          {sk(40, 24, 20)}
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, background: '#e3e0d8', borderRadius: 10, overflow: 'hidden', marginBottom: 40 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 15px', background: '#fbfaf7' }}>
              <div className="skeleton" style={{ width: '60%', height: 10, borderRadius: 3, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '80%', height: 16, borderRadius: 3 }} />
            </div>
          ))}
        </div>

        {/* Section stubs */}
        {['Demo', 'Notes', 'Chords', 'Structure', 'Riffs & tab', 'Lyrics'].map(label => (
          <div key={label} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#d6d0c8', flexShrink: 0 }} />
              <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 3 }} />
              <div style={{ flex: 1, height: 1, background: '#e3e0d8' }} />
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#d6d0c8' }} />
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
