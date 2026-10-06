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
        <clipPath id="bbBrainClip"><ellipse cx="110" cy="19" rx="22" ry="16" /></clipPath>
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

        <path
          d="M82 18 Q82 6 94 6 H126 Q138 6 138 18 V66 Q136 83 110 98 Q84 83 82 66 Z"
          fill="url(#bbArmor)"
          stroke="#d4dfe3"
          strokeWidth="3"
        />
        <path
          d="M87 43 Q110 32 133 43 L132 68 Q127 84 110 91 Q93 84 88 68 Z"
          fill="#edf3f5"
          stroke="#a8b8bf"
          strokeWidth="1.3"
        />
        <path d="M88 43 Q92 31 102 27 M132 43 Q128 31 118 27" fill="none" stroke="#c0ccd1" strokeWidth="1.2" opacity=".85" />
        <path d="M88 68 Q91 82 103 89 M132 68 Q129 82 117 89" fill="none" stroke="#9eafb6" strokeWidth="1" opacity=".6" />

        <image href="data:image/webp;base64,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" x="87" y="-4" width="46" height="46" clipPath="url(#bbBrainClip)" preserveAspectRatio="xMidYMid meet" />

        <rect x="88" y="48" width="16" height="11" rx="2" fill="#f8fbfc" stroke="#6d7d84" strokeWidth="1.2" />
        <rect x="116" y="48" width="16" height="11" rx="2" fill="#f8fbfc" stroke="#6d7d84" strokeWidth="1.2" />
        <rect x="93" y="50" width="6" height="7" rx="1.1" fill="#d664e3" />
        <rect x="121" y="50" width="6" height="7" rx="1.1" fill="#26d0fa" />
        <rect x="95" y="51.5" width="2" height="4" rx=".4" fill="#11181d" />
        <rect x="123" y="51.5" width="2" height="4" rx=".4" fill="#11181d" />
        <rect x="94.8" y="51.2" width="1.1" height="1.1" rx=".2" fill="#fff" />
        <rect x="122.8" y="51.2" width="1.1" height="1.1" rx=".2" fill="#fff" />
        <path d="M106 58 Q105 66 102 71 Q106 74 111 72" fill="none" stroke="#7f9098" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M114 61 Q116 67 114 72" fill="none" stroke="#b1bec3" strokeWidth=".9" strokeLinecap="round" />

        <path className="brainbot-pro-mouth-shell" d="M98 78 Q110 75 122 78" fill="none" stroke="#65777f" strokeWidth="1.4" strokeLinecap="round" />
        <g className="brainbot-pro-mouth">
          <path d="M99 79 Q110 84 121 79 Q110 88 99 79 Z" fill="#172229" stroke="#82959d" strokeWidth="1" />
          <path d="M102 81 Q110 83 118 81" fill="none" stroke="#d2dde1" strokeWidth=".8" strokeLinecap="round" opacity=".82" />
        </g>
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
            <path className="brainbot-pro-fingers brainbot-pro-fingers-left" d="M46 291 L44 307 M52 294 L52 311 M58 294 L59 311 M63 291 L65 306" stroke="#b7c7cd" strokeWidth="5" strokeLinecap="round" />
            <path className="brainbot-pro-thumb brainbot-pro-thumb-left" d="M44 282 L36 291" stroke="#a9bbc2" strokeWidth="6" strokeLinecap="round" />
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
            <path className="brainbot-pro-fingers brainbot-pro-fingers-right" d="M174 291 L176 307 M168 294 L168 311 M162 294 L161 311 M157 291 L155 306" stroke="#b7c7cd" strokeWidth="5" strokeLinecap="round" />
            <path className="brainbot-pro-thumb brainbot-pro-thumb-right" d="M176 282 L184 291" stroke="#a9bbc2" strokeWidth="6" strokeLinecap="round" />
          </g>
        </g>
      </g>

    </svg>
  );
}
