// Cosmora's celestial seal: a rayed sun ring around an eight-point star.
export default function Emblem({ size = 240, still = false }) {
  const rays = Array.from({ length: 24 }, (_, i) => i * 15);
  return <svg className={still ? undefined : 'emblem'} width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <linearGradient id="emblem-metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f3edff" /><stop offset=".5" stopColor="#b9a3f5" /><stop offset="1" stopColor="#6d4bc4" />
      </linearGradient>
      <radialGradient id="emblem-core">
        <stop offset="0" stopColor="#3b2275" /><stop offset="1" stopColor="#140a2e" />
      </radialGradient>
    </defs>
    {rays.map(angle => <path key={angle} d="M100 4 L106 30 L94 30 Z" fill="url(#emblem-metal)"
      opacity={angle % 30 ? 0.55 : 1} transform={`rotate(${angle} 100 100)`} />)}
    <circle cx="100" cy="100" r="68" fill="url(#emblem-core)" stroke="url(#emblem-metal)" strokeWidth="3" />
    <circle cx="100" cy="100" r="60" fill="none" stroke="#c4b5fd" strokeOpacity=".45" strokeDasharray="2 5" />
    <g className={still ? undefined : 'inner'}>
      {[0, 45].map(r => <path key={r} transform={`rotate(${r} 100 100)`} fill="url(#emblem-metal)" opacity={r ? 0.6 : 1}
        d="M100 46 L109 91 L154 100 L109 109 L100 154 L91 109 L46 100 L91 91 Z" />)}
      <circle cx="100" cy="100" r="13" fill="#140a2e" stroke="#e9e2ff" strokeWidth="2" />
      <circle cx="100" cy="100" r="5" fill="#f6b49a" />
    </g>
  </svg>;
}
