export function GreenTreePythonArt({ compact = false }: { compact?: boolean }) {
  return (
    <svg viewBox="0 0 720 440" role="img" aria-label="Stylized Green Tree Python on a branch" className="h-full w-full">
      <defs>
        <linearGradient id="snake" x1="0" x2="1">
          <stop offset="0" stopColor="#8ef0a7" />
          <stop offset=".52" stopColor="#49d87b" />
          <stop offset="1" stopColor="#1c9f58" />
        </linearGradient>
        <linearGradient id="branch" x1="0" x2="1">
          <stop offset="0" stopColor="#5b3b22" />
          <stop offset="1" stopColor="#2d2117" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>
      <ellipse cx="390" cy="205" rx="210" ry="125" fill="#39e67d" opacity=".07" filter="url(#glow)" />
      <path d="M65 320 C220 300 430 332 662 286" stroke="url(#branch)" strokeWidth="28" strokeLinecap="round" fill="none" />
      <path d="M116 318 C250 300 448 326 628 292" stroke="#9bb379" strokeOpacity=".12" strokeWidth="7" strokeLinecap="round" fill="none" />
      {!compact && <>
        <path d="M74 345 C120 318 144 278 158 228" stroke="#2b5538" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M126 278 C98 258 83 230 79 198" stroke="#24472f" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M610 300 C636 264 648 224 652 183" stroke="#2b5538" strokeWidth="8" fill="none" strokeLinecap="round" />
        <ellipse cx="74" cy="192" rx="36" ry="14" transform="rotate(-42 74 192)" fill="#163d27" />
        <ellipse cx="159" cy="218" rx="42" ry="16" transform="rotate(-65 159 218)" fill="#1c4a30" />
        <ellipse cx="650" cy="176" rx="43" ry="16" transform="rotate(-70 650 176)" fill="#1c4a30" />
      </>}
      <path d="M205 298 C161 264 174 198 235 177 C295 157 331 200 310 242 C289 285 242 271 228 235 C210 189 273 151 351 167 C432 184 448 252 410 283 C373 314 317 286 320 245 C324 202 375 181 429 201 C492 225 483 291 438 310" stroke="url(#snake)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M204 298 C176 272 184 218 232 194" stroke="#d6ffd9" strokeOpacity=".18" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M438 310 C482 323 524 305 546 274" stroke="url(#snake)" strokeWidth="32" strokeLinecap="round" fill="none" />
      <g transform="translate(523 230) rotate(-12)">
        <path d="M0 28 C22 -5 78 -11 112 9 C126 17 132 31 126 44 C117 65 68 72 31 58 C10 50 -6 42 0 28Z" fill="url(#snake)" />
        <path d="M72 17 C92 14 105 20 112 31 C101 27 88 27 76 33Z" fill="#a9f4b7" opacity=".3" />
        <ellipse cx="88" cy="27" rx="5.8" ry="7.2" fill="#e6ba57" />
        <ellipse cx="89" cy="27" rx="1.7" ry="5.8" fill="#08110c" />
        <path d="M112 44 C120 44 128 42 136 38" stroke="#1a7e46" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g opacity=".46" fill="#d8ffdc">
        <circle cx="258" cy="198" r="2.3" /><circle cx="283" cy="207" r="2" /><circle cx="344" cy="190" r="2.2" /><circle cx="382" cy="216" r="2" /><circle cx="420" cy="235" r="1.9" /><circle cx="471" cy="280" r="2" />
      </g>
    </svg>
  );
}

export function PitcherPlantArt() {
  return (
    <svg viewBox="0 0 280 320" className="h-full w-full" aria-hidden="true">
      <path d="M145 305 C140 220 128 132 112 48" stroke="#376f48" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M139 239 C86 233 56 196 66 159 C75 127 113 129 132 154 C153 184 149 211 139 239Z" fill="#294e34" />
      <path d="M117 130 C66 112 50 71 73 43 C94 18 127 35 139 64 C150 91 138 114 117 130Z" fill="#306040" />
      <path d="M146 220 C184 190 223 187 238 213 C251 237 231 265 200 270 C177 274 158 257 146 220Z" fill="#315f3e" />
      <path d="M111 148 C112 190 118 224 126 260" stroke="#6eaa69" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M108 150 C77 159 72 194 86 222 C97 245 120 246 133 224 C145 203 136 164 108 150Z" fill="#803f3d" />
      <path d="M85 158 C97 145 120 142 136 151" stroke="#c28165" strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="111" cy="151" rx="25" ry="8" fill="#3b1d1f" />
    </svg>
  );
}
