export default function BrainBotFigure() {
  return (
    <svg className="brainbot-pro" viewBox="25 0 170 220" role="img" aria-label="BrainBot, robot humanoide de AxiomAI">
      <title>BrainBot de AxiomAI</title>
      <defs>
        <linearGradient id="bbArmor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4fdff" />
          <stop offset=".42" stopColor="#d8eff5" />
          <stop offset=".72" stopColor="#9fc6d2" />
          <stop offset="1" stopColor="#effaff" />
        </linearGradient>
        <linearGradient id="bbArmorDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2f4f8" />
          <stop offset=".55" stopColor="#8fb9c6" />
          <stop offset="1" stopColor="#344c57" />
        </linearGradient>
        <linearGradient id="bbMetal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#14202a" />
          <stop offset=".34" stopColor="#71838c" />
          <stop offset=".56" stopColor="#18242c" />
          <stop offset=".8" stopColor="#8ca0a9" />
          <stop offset="1" stopColor="#0b1218" />
        </linearGradient>
        <radialGradient id="bbCore">
          <stop offset="0" stopColor="#ecfeff" />
          <stop offset=".25" stopColor="#9af6ff" />
          <stop offset=".58" stopColor="#27dff2" />
          <stop offset="1" stopColor="#08728d" />
        </radialGradient>
        <filter id="bbGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="bbHeadShell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4fdff" />
          <stop offset=".36" stopColor="#c9edf7" />
          <stop offset=".72" stopColor="#84bcd1" />
          <stop offset="1" stopColor="#e8faff" />
        </linearGradient>
        <clipPath id="bbBrainClip"><rect x="92" y="12" width="36" height="31" rx="10" /></clipPath>
      </defs>
      
      <ellipse cx="110" cy="198" rx="42" ry="4.5" fill="#000" opacity=".22" />

      <g className="brainbot-pro-leg brainbot-pro-leg-left">
        <path d="M94 155 Q100 152 106 155 L106 168 Q105 172 101 173 H97 Q93 171 93 168 Z" fill="url(#bbArmor)" stroke="#a9cbd5" strokeWidth="2" />
        <circle cx="99.5" cy="172" r="5" fill="#263b45" stroke="#9abac4" strokeWidth="1.6" />
        <circle cx="99.5" cy="172" r="2" fill="url(#bbArmor)" />
        <path d="M89 178 Q99 175 108 178 L110 183 Q110 187 106 188 H90 Q86 187 87 183 Z" fill="url(#bbArmorDark)" stroke="#a9cbd5" strokeWidth="1.8" />
        <path d="M91 183 H106" stroke="#d2f6fb" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g className="brainbot-pro-leg brainbot-pro-leg-right">
        <path d="M126 155 Q120 152 114 155 L114 168 Q115 172 119 173 H123 Q127 171 127 168 Z" fill="url(#bbArmor)" stroke="#a9cbd5" strokeWidth="2" />
        <circle cx="120.5" cy="172" r="5" fill="#263b45" stroke="#9abac4" strokeWidth="1.6" />
        <circle cx="120.5" cy="172" r="2" fill="url(#bbArmor)" />
        <path d="M131 178 Q121 175 112 178 L110 183 Q110 187 114 188 H130 Q134 187 133 183 Z" fill="url(#bbArmorDark)" stroke="#a9cbd5" strokeWidth="1.8" />
        <path d="M129 183 H114" stroke="#d2f6fb" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <g className="brainbot-pro-body">
        <path d="M88 101 Q91 97 99 97 H121 Q130 97 133 101 L143 127 Q147 143 135 153 Q110 164 85 153 Q73 143 77 127 Z" fill="url(#bbArmor)" stroke="#9ec8d4" strokeWidth="2.7" />
        <path d="M88 106 Q110 99 132 106" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".88" />
        <path d="M79 127 Q84 130 88 128 M132 128 Q136 130 141 127" fill="none" stroke="#6edcea" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="92" y="112" width="36" height="29" rx="9" fill="#09283a" stroke="#54d5e7" strokeWidth="2" />
        <rect x="96" y="116" width="28" height="21" rx="6" fill="#061722" stroke="#347284" strokeWidth="1" />
        <circle cx="110" cy="126.5" r="6.5" fill="url(#bbCore)" filter="url(#bbGlow)" />
        <circle cx="110" cy="126.5" r="2.2" fill="#eaffff" />
        <path d="M101 145 H119" stroke="#789eaa" strokeWidth="2.3" strokeLinecap="round" />
      </g>

      <g className="brainbot-pro-pelvis">
        <path d="M91 149 Q110 144 129 149 L127 162 Q110 168 93 162 Z" fill="url(#bbArmorDark)" stroke="#9ec7d2" strokeWidth="2" />
        <path d="M98 152 Q110 149 122 152 L121 159 Q110 163 99 159 Z" fill="#142a35" stroke="#6d9baa" strokeWidth="1.2" />
        <path d="M105 155 H115 M104 158 H116" stroke="#77dfe9" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      <g className="brainbot-pro-neck">
        <path d="M99 88 H121 L123 101 Q110 106 97 101 Z" fill="url(#bbMetal)" stroke="#71858f" strokeWidth="1.6" />
        <path d="M101 95 H119 M100 99 H120" stroke="#c5e7ed" strokeWidth="1.8" strokeLinecap="round" />
      </g>

<g className="brainbot-pro-head">
        <g transform="translate(19.8 9.4) scale(.82)">
        <path d="M110 10 V1" fill="none" stroke="#30dff5" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="110" cy="0" r="5.5" fill="#45e7fb" stroke="#d9fdff" strokeWidth="1.3" filter="url(#bbGlow)" />
        <path d="M78 8 Q110 -1 142 8 Q176 16 176 42 V70 Q176 98 145 104 H75 Q44 98 44 70 V42 Q44 16 78 8 Z" fill="url(#bbArmor)" stroke="#85d5e7" strokeWidth="2.6" />
        <path d="M70 28 Q72 13 87 12 M150 27 Q147 13 133 12" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity=".72" />
        <path d="M62 68 Q64 89 83 92 M158 68 Q156 89 137 92" fill="none" stroke="#80c9dd" strokeWidth="1.2" opacity=".58" />
        <rect x="59" y="46" width="102" height="32" rx="16" fill="#020813" stroke="#48cce8" strokeWidth="2" />
        <rect x="63" y="49" width="94" height="26" rx="13" fill="#030a14" stroke="#152c39" strokeWidth="1" />
        <rect x="76" y="51" width="23" height="22" rx="8" fill="#ec65db" stroke="#ffc8f8" strokeWidth="1.2" filter="url(#bbGlow)" />
        <rect x="82" y="57" width="11" height="10" rx="3.5" fill="#06101a" />
        <rect x="79" y="53" width="4" height="2" rx="1" fill="#fff" opacity=".72" />
        <rect x="121" y="51" width="23" height="22" rx="8" fill="#26d0fa" stroke="#c9faff" strokeWidth="1.2" filter="url(#bbGlow)" />
        <rect x="127" y="57" width="11" height="10" rx="3.5" fill="#06101a" />
        <rect x="124" y="53" width="4" height="2" rx="1" fill="#fff" opacity=".76" />
        <rect x="92" y="12" width="36" height="31" rx="10" fill="#071523" stroke="#76e4f4" strokeWidth="1.3" />
        <image href="data:image/webp;base64,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" x="94" y="12" width="32" height="28" clipPath="url(#bbBrainClip)" preserveAspectRatio="xMidYMid meet" />
        <rect className="brainbot-pro-mouth-frame" x="92" y="77" width="36" height="14" rx="2.5" fill="#020913" stroke="#50d9ed" strokeWidth="1.6" />
        <g className="brainbot-pro-mouth" style={{ transformBox: "fill-box", transformOrigin: "center", transform: "scaleX(var(--robot-mouth-width, 1)) scaleY(var(--robot-mouth-open, .3))", transition: "transform 65ms linear" }}>
          <rect x="95" y="80" width="30" height="8" rx="1" fill="#07131a" stroke="#4cd7e7" strokeWidth=".8" />
          <path d="M100 80.5 V87.5 M107 80.5 V87.5 M114 80.5 V87.5 M121 80.5 V87.5" fill="none" stroke="#a8f7ff" strokeWidth="1.4" strokeLinecap="square" />
        </g>
        </g>
      </g>
      <g className="brainbot-pro-arm brainbot-pro-arm-left">
        <circle cx="74" cy="111" r="8.5" fill="url(#bbArmor)" stroke="#b9c9cf" strokeWidth="2" />
        <circle cx="74" cy="111" r="3.4" fill="#14232b" stroke="#71858e" strokeWidth="1.5" />
        <path d="M68 117 Q63 121 63 128 L66 135 L75 134 L79 122 L76 117 Z" fill="url(#bbArmor)" stroke="#a9cbd5" strokeWidth="2" />
        <path d="M67 123 L75 124" stroke="#58d5e5" strokeWidth="1.8" strokeLinecap="round" />
        <g className="brainbot-pro-forearm brainbot-pro-forearm-left">
          <circle cx="66" cy="132" r="4.5" fill="#263b45" stroke="#9abac4" strokeWidth="1.5" />
          <path d="M63 135 Q58 138 58 144 L61 149 L69 149 L72 141 L69 135 Z" fill="url(#bbArmor)" stroke="#a9cbd5" strokeWidth="1.8" />
          <path d="M60 142 H70" stroke="#58d5e5" strokeWidth="1.5" strokeLinecap="round" />
          <g className="brainbot-pro-hand brainbot-pro-hand-left">
            <path d="M57 145 Q61 141 67 144 L70 149 Q69 154 64 155 H59 Q55 153 56 149 Z" fill="url(#bbArmorDark)" stroke="#adbdc4" strokeWidth="1.7" />
            <path className="brainbot-pro-fingers brainbot-pro-fingers-left" d="M58 152 L57 158 M62 153 L62 159 M66 152 L67 158" stroke="#b7c7cd" strokeWidth="2.4" strokeLinecap="round" />
            <path className="brainbot-pro-thumb brainbot-pro-thumb-left" d="M57 148 L53 151" stroke="#a9bbc2" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        </g>
      </g>

      <g className="brainbot-pro-arm brainbot-pro-arm-right">
        <circle cx="146" cy="111" r="8.5" fill="url(#bbArmor)" stroke="#b9c9cf" strokeWidth="2" />
        <circle cx="146" cy="111" r="3.4" fill="#14232b" stroke="#71858e" strokeWidth="1.5" />
        <path d="M152 117 Q157 121 157 128 L154 135 L145 134 L141 122 L144 117 Z" fill="url(#bbArmor)" stroke="#a9cbd5" strokeWidth="2" />
        <path d="M153 123 L145 124" stroke="#58d5e5" strokeWidth="1.8" strokeLinecap="round" />
        <g className="brainbot-pro-forearm brainbot-pro-forearm-right">
          <circle cx="154" cy="132" r="4.5" fill="#263b45" stroke="#9abac4" strokeWidth="1.5" />
          <path d="M157 135 Q162 138 162 144 L159 149 L151 149 L148 141 L151 135 Z" fill="url(#bbArmor)" stroke="#a9cbd5" strokeWidth="1.8" />
          <path d="M160 142 H150" stroke="#58d5e5" strokeWidth="1.5" strokeLinecap="round" />
          <g className="brainbot-pro-hand brainbot-pro-hand-right">
            <path d="M163 145 Q159 141 153 144 L150 149 Q151 154 156 155 H161 Q165 153 164 149 Z" fill="url(#bbArmorDark)" stroke="#adbdc4" strokeWidth="1.7" />
            <path className="brainbot-pro-fingers brainbot-pro-fingers-right" d="M162 152 L163 158 M158 153 L158 159 M154 152 L153 158" stroke="#b7c7cd" strokeWidth="2.4" strokeLinecap="round" />
            <path className="brainbot-pro-thumb brainbot-pro-thumb-right" d="M163 148 L167 151" stroke="#a9bbc2" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        </g>
      </g>

    </svg>
  );
}
