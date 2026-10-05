export default function BrainBotFigure() {
  return (
    <svg className="brainbot-pro" viewBox="0 0 220 430" role="img" aria-label="BrainBot, robot humanoide de AxiomAI">
      <title>BrainBot de AxiomAI</title>
      <defs>
        <linearGradient id="bbArmor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".42" stopColor="#e8eef1" />
          <stop offset=".72" stopColor="#9aaab2" />
          <stop offset="1" stopColor="#f8fbfc" />
        </linearGradient>
        <linearGradient id="bbArmorDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eaf0f2" />
          <stop offset=".55" stopColor="#8798a1" />
          <stop offset="1" stopColor="#34434c" />
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
        <clipPath id="bbBrainClip"><ellipse cx="110" cy="34" rx="17" ry="15" /></clipPath>
      </defs>

      <ellipse cx="110" cy="420" rx="72" ry="8" fill="#000" opacity=".34" />

      <g className="brainbot-pro-body">
        <path d="M80 100 L97 91 H123 L140 100 L154 128 L146 220 L126 246 H94 L74 220 L66 128 Z" fill="#111b22" stroke="#738993" strokeWidth="3" />
        <path d="M68 116 L88 101 L104 111 L96 145 L70 153 L60 135 Z" fill="url(#bbArmor)" stroke="#d2dde1" strokeWidth="2" />
        <path d="M152 116 L132 101 L116 111 L124 145 L150 153 L160 135 Z" fill="url(#bbArmor)" stroke="#d2dde1" strokeWidth="2" />
        <path d="M83 151 Q110 137 137 151 L143 194 Q110 217 77 194 Z" fill="url(#bbArmorDark)" stroke="#b5c5cc" strokeWidth="2" />
        <path d="M92 152 Q110 145 128 152 L132 187 Q110 197 88 187 Z" fill="#071017" stroke="#526873" strokeWidth="2" />
        <circle cx="110" cy="169" r="12" fill="url(#bbCore)" filter="url(#bbGlow)" />
        <circle cx="110" cy="169" r="4" fill="#eaffff" />
        <path d="M91 205 H129 L136 225 L122 243 H98 L84 225 Z" fill="#15222a" stroke="#6d818a" strokeWidth="2" />
        <path d="M96 211 H124 M93 218 H127 M96 225 H124" stroke="#aebdc3" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g className="brainbot-pro-pelvis">
        <path d="M76 231 L95 220 H125 L144 231 L137 267 L119 281 H101 L83 267 Z" fill="url(#bbArmor)" stroke="#bac8ce" strokeWidth="3" />
        <path d="M95 237 H125 L130 257 L119 268 H101 L90 257 Z" fill="#101a21" stroke="#60747e" strokeWidth="2" />
      </g>

      <g className="brainbot-pro-arm brainbot-pro-arm-left">
        <circle cx="62" cy="126" r="18" fill="url(#bbArmor)" stroke="#b9c9cf" strokeWidth="3" />
        <circle cx="62" cy="126" r="7" fill="#101920" stroke="#71858e" strokeWidth="3" />
        <path d="M54 139 Q43 164 46 191 L57 207 L69 194 L72 150 L66 137 Z" fill="#111b22" stroke="#657983" strokeWidth="3" />
        <path d="M51 142 Q45 161 48 180 L61 185 L68 148 L63 141 Z" fill="url(#bbArmor)" stroke="#c1cfd4" strokeWidth="2" />
        <g className="brainbot-pro-forearm brainbot-pro-forearm-left">
          <circle cx="57" cy="205" r="12" fill="#111a20" stroke="#95a8b0" strokeWidth="4" />
          <path d="M51 214 L64 211 L70 259 L61 283 L47 270 L45 229 Z" fill="#111b22" stroke="#627680" strokeWidth="3" />
          <path d="M49 220 L62 216 L66 254 L57 268 L49 261 Z" fill="url(#bbArmor)" stroke="#c1cfd4" strokeWidth="2" />
          <g className="brainbot-pro-hand brainbot-pro-hand-left">
            <path d="M48 269 L63 269 L70 284 L63 301 L48 298 L42 283 Z" fill="url(#bbArmorDark)" stroke="#adbdc4" strokeWidth="2" />
            <path d="M45 292 L42 317 M51 296 L50 323 M57 296 L58 323 M63 292 L66 316" stroke="#b7c7cd" strokeWidth="5" strokeLinecap="round" />
            <path d="M44 282 L34 296" stroke="#a9bbc2" strokeWidth="6" strokeLinecap="round" />
          </g>
        </g>
      </g>

      <g className="brainbot-pro-arm brainbot-pro-arm-right">
        <circle cx="158" cy="126" r="18" fill="url(#bbArmor)" stroke="#b9c9cf" strokeWidth="3" />
        <circle cx="158" cy="126" r="7" fill="#101920" stroke="#71858e" strokeWidth="3" />
        <path d="M166 139 Q177 164 174 191 L163 207 L151 194 L148 150 L154 137 Z" fill="#111b22" stroke="#657983" strokeWidth="3" />
        <path d="M169 142 Q175 161 172 180 L159 185 L152 148 L157 141 Z" fill="url(#bbArmor)" stroke="#c1cfd4" strokeWidth="2" />
        <g className="brainbot-pro-forearm brainbot-pro-forearm-right">
          <circle cx="163" cy="205" r="12" fill="#111a20" stroke="#95a8b0" strokeWidth="4" />
          <path d="M169 214 L156 211 L150 259 L159 283 L173 270 L175 229 Z" fill="#111b22" stroke="#627680" strokeWidth="3" />
          <path d="M171 220 L158 216 L154 254 L163 268 L171 261 Z" fill="url(#bbArmor)" stroke="#c1cfd4" strokeWidth="2" />
          <g className="brainbot-pro-hand brainbot-pro-hand-right">
            <path d="M172 269 L157 269 L150 284 L157 301 L172 298 L178 283 Z" fill="url(#bbArmorDark)" stroke="#adbdc4" strokeWidth="2" />
            <path d="M175 292 L178 317 M169 296 L170 323 M163 296 L162 323 M157 292 L154 316" stroke="#b7c7cd" strokeWidth="5" strokeLinecap="round" />
            <path d="M176 282 L186 296" stroke="#a9bbc2" strokeWidth="6" strokeLinecap="round" />
          </g>
        </g>
      </g>

      <g className="brainbot-pro-leg brainbot-pro-leg-left">
        <path d="M88 263 L105 263 L108 329 L100 347 L82 340 L78 287 Z" fill="#111a21" stroke="#5e727c" strokeWidth="3" />
        <path d="M83 270 L101 269 L102 321 L94 329 L82 322 Z" fill="url(#bbArmor)" stroke="#c0cdd2" strokeWidth="2" />
        <circle cx="94" cy="340" r="13" fill="#111a20" stroke="#98aab2" strokeWidth="4" />
        <path d="M85 349 L102 350 L105 401 L96 414 L78 406 L78 363 Z" fill="url(#bbArmor)" stroke="#b8c6cc" strokeWidth="3" />
        <path d="M78 402 L99 403 L112 416 L105 424 H70 L68 414 Z" fill="url(#bbArmorDark)" stroke="#aabac1" strokeWidth="3" />
      </g>
      <g className="brainbot-pro-leg brainbot-pro-leg-right">
        <path d="M132 263 L115 263 L112 329 L120 347 L138 340 L142 287 Z" fill="#111a21" stroke="#5e727c" strokeWidth="3" />
        <path d="M137 270 L119 269 L118 321 L126 329 L138 322 Z" fill="url(#bbArmor)" stroke="#c0cdd2" strokeWidth="2" />
        <circle cx="126" cy="340" r="13" fill="#111a20" stroke="#98aab2" strokeWidth="4" />
        <path d="M135 349 L118 350 L115 401 L124 414 L142 406 L142 363 Z" fill="url(#bbArmor)" stroke="#b8c6cc" strokeWidth="3" />
        <path d="M142 402 L121 403 L108 416 L115 424 H150 L152 414 Z" fill="url(#bbArmorDark)" stroke="#aabac1" strokeWidth="3" />
      </g>

      <g className="brainbot-pro-neck">
        <path d="M96 83 H124 L129 111 L119 124 H101 L91 111 Z" fill="url(#bbMetal)" stroke="#71858f" strokeWidth="2" />
        <path d="M99 91 H121 M97 99 H123 M95 107 H125" stroke="#a8bac1" strokeWidth="3" />
      </g>

      <g className="brainbot-pro-head">
        <path d="M78 24 Q82 5 110 3 Q138 5 142 24 L139 70 Q130 91 110 98 Q90 91 81 70 Z" fill="url(#bbArmor)" stroke="#d0dce1" strokeWidth="3" />
        <path d="M84 48 Q110 34 136 48 L134 73 Q124 86 110 89 Q96 86 86 73 Z" fill="#dbe3e6" opacity=".65" />
        <path d="M77 39 H84 V67 H76 Q70 54 77 39 M143 39 H136 V67 H144 Q150 54 143 39" fill="#18242b" stroke="#80939c" strokeWidth="2" />
        <image href="/axiomos-brain-neon.png" x="91" y="15" width="38" height="38" clipPath="url(#bbBrainClip)" preserveAspectRatio="xMidYMid meet" />
        <ellipse cx="96" cy="55" rx="5" ry="3.2" fill="#80ecff" filter="url(#bbGlow)" />
        <ellipse cx="124" cy="55" rx="5" ry="3.2" fill="#80ecff" filter="url(#bbGlow)" />
        <circle cx="96" cy="55" r="1.5" fill="#071017" />
        <circle cx="124" cy="55" r="1.5" fill="#071017" />
        <path d="M107 60 L104 70 H113" fill="none" stroke="#7b8c94" strokeWidth="2" strokeLinecap="round" />
        <rect className="brainbot-pro-mouth" x="94" y="76" width="32" height="8" rx="4" fill="#071017" stroke="#73dbea" strokeWidth="1.5" />
        <path d="M98 80 H122" stroke="#b9f8ff" strokeWidth="1.5" opacity=".85" />
      </g>
    </svg>
  );
}
