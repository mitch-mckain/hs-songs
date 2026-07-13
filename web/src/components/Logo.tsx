interface Props {
  size?: number
}

export default function Logo({ size = 40 }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="g6q" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A4440"/>
          <stop offset="1" stopColor="#0A0908"/>
        </linearGradient>
        <linearGradient id="g6q-cass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF"/>
          <stop offset="1" stopColor="#E9E5E0"/>
        </linearGradient>
        <mask id="mask-cass-w">
          <g transform="rotate(-6 50 50)">
            <rect x="10" y="24" width="80" height="52" rx="9" fill="#FFFFFF"/>
            <rect x="16" y="35" width="68" height="30" rx="15" fill="#000000"/>
            <line x1="32" y1="42.5" x2="68" y2="42.5" stroke="#FFFFFF" strokeWidth="3"/>
            <line x1="32" y1="57.5" x2="68" y2="57.5" stroke="#FFFFFF" strokeWidth="3"/>
            <circle cx="32" cy="50" r="9.5" fill="#FFFFFF"/>
            <circle cx="32" cy="50" r="3.8" fill="#000000"/>
            <circle cx="68" cy="50" r="9.5" fill="#FFFFFF"/>
            <circle cx="68" cy="50" r="3.8" fill="#000000"/>
          </g>
        </mask>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#g6q)"/>
      <g transform="translate(50 50) scale(0.88) translate(-50 -50)">
        <rect width="100" height="100" rx="20" fill="url(#g6q-cass)" mask="url(#mask-cass-w)"/>
      </g>
    </svg>
  )
}
