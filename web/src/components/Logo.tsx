interface Props {
  size?: number
}

export default function Logo({ size = 40 }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size}>
      <rect width="100" height="100" fill="#151312"/>
      <g transform="rotate(-6 50 50)">
        <rect x="10" y="24" width="80" height="52" rx="9" fill="#F5F1E8"/>
        <rect x="22" y="40" width="56" height="24" rx="12" fill="#151312"/>
        <line x1="36" y1="46" x2="64" y2="46" stroke="#F5F1E8" strokeWidth="2.5"/>
        <line x1="36" y1="58" x2="64" y2="58" stroke="#F5F1E8" strokeWidth="2.5"/>
        <circle cx="36" cy="52" r="7.5" fill="#F5F1E8"/>
        <circle cx="36" cy="52" r="3" fill="#151312"/>
        <circle cx="64" cy="52" r="7.5" fill="#F5F1E8"/>
        <circle cx="64" cy="52" r="3" fill="#151312"/>
        <text x="50" y="35.5" textAnchor="middle" fontFamily="'Archivo Black', sans-serif" fontWeight="400" fontSize="11" fill="#151312">DEMO</text>
        <text x="50" y="71.4" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="3.4" letterSpacing="1.2" fill="#151312">HEAVY SWEATER</text>
      </g>
    </svg>
  )
}
