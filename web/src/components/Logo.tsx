interface Props {
  size?: number
}

export default function Logo({ size = 40 }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 112 112">
      <defs>
        <path id="gs30a" d="M0,-10 L2,-6.5 L5.9,-7.7 L5.7,-4 L9.5,-3.2 L7.3,0 L9.5,3.2 L5.7,4 L5.9,7.7 L2,6.5 L0,10 L-2,6.5 L-5.9,7.7 L-5.7,4 L-9.5,3.2 L-7.3,0 L-9.5,-3.2 L-5.7,-4 L-5.9,-7.7 L-2,-6.5 Z"/>
      </defs>
      <rect x="0" y="0" width="112" height="112" rx="26" fill="#FDFBF6"/>
      <rect x="0" y="0" width="112" height="112" rx="26" fill="none" stroke="#E7E2D6" strokeWidth="1.5"/>
      <rect x="10" y="24" width="92" height="64" rx="10" fill="#1a1a1f"/>
      <circle cx="18" cy="31" r="1.9" fill="#FDFBF6"/>
      <circle cx="94" cy="31" r="1.9" fill="#FDFBF6"/>
      <circle cx="18" cy="81" r="1.9" fill="#FDFBF6"/>
      <circle cx="94" cy="81" r="1.9" fill="#FDFBF6"/>
      <rect x="24" y="30" width="64" height="15" rx="3" fill="#FDFBF6"/>
      <line x1="30" y1="35" x2="58" y2="35" stroke="#c7c3ba" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="30" y1="40" x2="76" y2="40" stroke="#c7c3ba" strokeWidth="1.2" strokeLinecap="round"/>
      <rect x="47" y="67.5" width="18" height="3" rx="1.5" fill="#3a2b1e" fillOpacity="0.85"/>
      <use href="#gs30a" x="37" y="69" fill="#FDFBF6"/>
      <use href="#gs30a" x="75" y="69" fill="#FDFBF6"/>
      <circle cx="37" cy="69" r="3.6" fill="#1a1a1f"/>
      <circle cx="75" cy="69" r="3.6" fill="#1a1a1f"/>
      <rect x="26" y="84.5" width="7" height="3.2" rx="1" fill="#FDFBF6"/>
      <rect x="79" y="84.5" width="7" height="3.2" rx="1" fill="#FDFBF6"/>
    </svg>
  )
}
