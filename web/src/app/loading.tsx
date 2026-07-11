export default function LibraryLoading() {
  const rows = Array.from({ length: 8 })

  return (
    <div style={{ minHeight: '100vh', background: '#fbfaf7' }}>
      <div className="lib-container" style={{ maxWidth: 920, margin: '0 auto', paddingTop: 40, paddingLeft: 24, paddingRight: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div className="skeleton" style={{ width: 200, height: 32, borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton" style={{ width: 80, height: 32, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: 100, height: 32, borderRadius: 8 }} />
          </div>
        </div>

        {/* Search bar */}
        <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8, marginBottom: 28 }} />

        {/* Section heading */}
        <div className="skeleton" style={{ width: 60, height: 11, borderRadius: 3, marginBottom: 10 }} />

        {/* Song rows */}
        <div style={{ borderTop: '1px solid #e3e0d8' }}>
          {rows.map((_, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 8px', borderBottom: '1px solid #e3e0d8' }}
            >
              {/* Cassette placeholder */}
              <div className="cassette-cell skeleton" style={{ width: 96, height: 67, borderRadius: 4, flexShrink: 0 }} />
              {/* Play button */}
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: `${40 + (i % 3) * 15}%`, height: 16, borderRadius: 3 }} />
                  <div className="skeleton" style={{ width: 52, height: 20, borderRadius: 20, flexShrink: 0 }} />
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div className="skeleton" style={{ width: 48, height: 11, borderRadius: 3 }} />
                  <div className="skeleton" style={{ width: 44, height: 11, borderRadius: 3 }} />
                  <div className="skeleton" style={{ width: 68, height: 11, borderRadius: 3 }} />
                </div>
              </div>
              {/* Date */}
              <div className="lib-date" style={{ flexShrink: 0, textAlign: 'right' }}>
                <div className="skeleton" style={{ width: 52, height: 11, borderRadius: 3, marginBottom: 4, marginLeft: 'auto' }} />
                <div className="skeleton" style={{ width: 72, height: 10, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
