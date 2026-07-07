import type { DiagramData } from '@/lib/chords'

interface Props {
  data: DiagramData
  size?: 'small' | 'large'
}

// small: 80×100 (finder picker), large: 96×128 (chords section)
export default function ChordDiagram({ data, size = 'large' }: Props) {
  const w = size === 'small' ? 80 : 96
  const h = size === 'small' ? 100 : 128
  const dotR = size === 'small' ? 8 : 9.5

  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {data.fretLabel && (
        <div style={{
          position: 'absolute', left: -3, top: size === 'small' ? 8 : 10,
          fontSize: size === 'small' ? 10 : 12, color: '#9b9a97',
          width: 11, textAlign: 'center', zIndex: 1,
          fontFamily: '-apple-system,Helvetica Neue,Helvetica,Arial,sans-serif',
        }}>
          {data.fretLabel}
        </div>
      )}
      <svg
        width={w}
        height={h}
        viewBox="-8 0 112 128"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {/* Strings (vertical lines) */}
        {[10, 26.4, 42.8, 59.2, 75.6, 92].map(x => (
          <line key={x} x1={x} y1="14" x2={x} y2="110" stroke="#191a1a" strokeWidth="1.3" />
        ))}

        {/* Nut / top fret line */}
        {data.isOpen
          ? <rect x="10" y="12" width="82" height="4" fill="#191a1a" />
          : <line x1="10" y1="14" x2="92" y2="14" stroke="#191a1a" strokeWidth="1.3" />
        }

        {/* Fret lines */}
        {[38, 62, 86, 110].map(y => (
          <line key={y} x1="10" y1={y} x2="92" y2={y} stroke="#191a1a" strokeWidth="1" />
        ))}

        {/* Barre */}
        {data.barreRect && (
          <rect
            x={data.barreRect.x}
            y={data.barreRect.y}
            width={data.barreRect.width}
            height={data.barreRect.height}
            rx="3"
            fill="#191a1a"
          />
        )}

        {/* Muted strings */}
        {data.mutes.map(m => (
          <text
            key={m.x}
            x={m.x}
            y="4"
            fontSize="20"
            fontWeight="700"
            fill="#191a1a"
            textAnchor="middle"
            fontFamily="-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif"
            dominantBaseline="central"
          >
            ×
          </text>
        ))}

        {/* Open strings */}
        {data.opens.map(o => (
          <circle key={o.x} cx={o.x} cy="4" r="4.5" fill="none" stroke="#191a1a" strokeWidth="1.5" />
        ))}

        {/* Finger dots */}
        {data.dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={dotR} fill="#191a1a" />
        ))}
      </svg>
    </div>
  )
}
