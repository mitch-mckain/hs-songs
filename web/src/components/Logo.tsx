interface Props {
  size?: number
}

export default function Logo({ size = 40 }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size}>
      <rect width="100" height="100" rx="20" fill="#151312"/>
      <g transform="rotate(-6 50 50)">
        <rect x="10" y="24" width="80" height="52" rx="9" fill="#FFFFFF"/>
        <rect x="22" y="40" width="56" height="24" rx="12" fill="#151312"/>
        <line x1="36" y1="46" x2="64" y2="46" stroke="#FFFFFF" strokeWidth="2.5"/>
        <line x1="36" y1="58" x2="64" y2="58" stroke="#FFFFFF" strokeWidth="2.5"/>
        <circle cx="36" cy="52" r="7.5" fill="#FFFFFF"/>
        <circle cx="36" cy="52" r="3" fill="#151312"/>
        <circle cx="64" cy="52" r="7.5" fill="#FFFFFF"/>
        <circle cx="64" cy="52" r="3" fill="#151312"/>
      </g>
    </svg>
  )
}
