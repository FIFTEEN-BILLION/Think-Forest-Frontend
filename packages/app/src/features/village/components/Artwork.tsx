// Static SVG artwork adapted from legacy/v2/index.html into native React elements.
export function VillageArt() {
  return (
    <svg
      viewBox="0 0 520 370"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="생각숲, 실험실과 마음극장이 초록 언덕에 모여 있는 생각숲 일러스트"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#e9eed9" />
          <stop offset="1" stopColor="#d7e1c5" />
        </linearGradient>
        <pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="2" r=".65" fill="#6b8253" opacity=".08" />
        </pattern>
      </defs>
      <path fill="url(#sky)" d="M0 0h520v370H0z" />
      <circle cx="415" cy="62" r="28" fill="#faf2c5" />
      <path d="M-20 228Q84 73 214 213Q348 94 550 188v205H-20" fill="#c1d1a7" />
      <path d="M-20 281Q139 145 287 247Q424 177 550 250v143H-20" fill="#aec595" />
      <path d="M-10 335Q117 229 245 304Q418 244 545 316v77H-10" fill="#8fae79" />
      <path
        d="M234 371q77-58 20-84t34-65q23-21 64-20"
        fill="none"
        stroke="#eee8c8"
        strokeWidth="33"
      />
      <g fill="#f6f6e4" opacity=".75">
        <ellipse cx="121" cy="60" rx="39" ry="10" />
        <ellipse cx="142" cy="56" rx="20" ry="13" />
        <ellipse cx="305" cy="91" rx="32" ry="8" />
      </g>
      <g stroke="#47613b" strokeWidth="5" strokeLinecap="round">
        <path d="M60 249v-61M106 229v-75M173 236v-42M439 245v-72M475 260v-44" />
      </g>
      <g fill="#547a4d">
        <ellipse cx="61" cy="167" rx="28" ry="43" />
        <ellipse cx="106" cy="130" rx="32" ry="50" />
        <ellipse cx="173" cy="180" rx="21" ry="33" />
      </g>
      <g fill="#739458">
        <ellipse cx="438" cy="151" rx="29" ry="44" />
        <ellipse cx="476" cy="201" rx="23" ry="35" />
      </g>
      <g transform="translate(190 146)">
        <path d="M0 42h95v77H0z" fill="#f4e9cb" />
        <path d="m-12 44 59-45 60 45" fill="#667650" />
        <path
          d="m-12 44 59-45 60 45"
          fill="none"
          stroke="#4d653f"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M37 120V84a12 12 0 0 1 24 0v36" fill="#758861" />
        <rect x="12" y="59" width="19" height="24" rx="3" fill="#b6cbaa" />
        <rect x="68" y="59" width="17" height="24" rx="3" fill="#b6cbaa" />
        <path d="M79 16V-8h13v32" fill="#899472" />
        <path d="M21 59v24M12 71h19M76 59v24M68 71h17" stroke="#f4e9cb" strokeWidth="2" />
      </g>
      <g transform="translate(333 178)">
        <rect width="81" height="67" rx="5" fill="#dfcbbb" />
        <path d="m-8 4 49-34L90 4" fill="#a8745b" />
        <path d="M18 68V35h46v33" fill="#f6e5d3" />
        <path d="M18 35q22 14 0 29M64 35Q43 48 64 64" fill="#ba8870" />
        <circle cx="41" cy="19" r="6" fill="#efe2bf" />
      </g>
      <g transform="translate(91 263)">
        <path d="M0 21h91v63H0z" fill="#efe4c6" />
        <path d="m-8 23 54-34 53 34" fill="#75896b" />
        <rect x="12" y="37" width="25" height="25" rx="3" fill="#afc7bd" />
        <path d="M51 84V47a12 12 0 0 1 24 0v37" fill="#6c8c75" />
        <path d="M18-3v-19h12v14" fill="#839479" />
      </g>
      <g transform="translate(302 294)">
        <ellipse cy="30" rx="25" ry="6" fill="#789366" opacity=".5" />
        <path d="M-12 1q-8-33 0-34 9 0 8 27M5-5q-1-28 6-28 9 4 3 34" fill="#f8edd6" />
        <ellipse cy="3" rx="18" ry="20" fill="#f8edd6" />
        <path d="M-18 28q1-26 18-23t18 23" fill="#f3c977" />
        <circle cx="-6" cy="0" r="1.5" fill="#42523a" />
        <circle cx="7" cy="0" r="1.5" fill="#42523a" />
        <path d="m-2 6 3 2 3-2" fill="none" stroke="#ab8364" strokeWidth="1.5" />
        <path d="M-8 24 9 12l10 15-17 12Z" fill="#f6efdc" />
      </g>
      <g fill="#f4e6a9">
        <circle cx="37" cy="311" r="3" />
        <circle cx="48" cy="320" r="2" />
        <circle cx="390" cy="305" r="3" />
        <circle cx="405" cy="313" r="2" />
        <circle cx="451" cy="327" r="3" />
      </g>
      <g fill="none" stroke="#6b8656" strokeWidth="2">
        <path d="m54 287 3-6 3 6m302 39 3-6 3 6m-295 48 3-6 3 6" />
      </g>
      <path fill="url(#grain)" d="M0 0h520v370H0z" />
    </svg>
  );
}
export function ForestArt() {
  return (
    <svg
      viewBox="0 0 480 265"
      role="img"
      aria-label="숲속 식탁, 꿀단지와 작은 발자국을 관찰하는 장면"
    >
      <path fill="#e2e9d4" d="M0 0h480v265H0z" />
      <circle cx="348" cy="55" r="29" fill="#f5ecc5" />
      <path d="M0 194Q126 91 246 189t234-20v96H0" fill="#b5c9a0" />
      <path d="M0 222q99-72 225-5t255-9v57H0" fill="#8faa7b" />
      <g stroke="#5a714b" strokeWidth="9">
        <path d="M55 220V43M408 219V42" />
      </g>
      <g fill="#648752">
        <ellipse cx="53" cy="48" rx="49" ry="66" />
        <ellipse cx="408" cy="59" rx="58" ry="71" />
      </g>
      <path d="M129 175h190l-9 15H138z" fill="#9d7c54" />
      <path d="m151 188-9 56m154-56 9 56" stroke="#876b4b" strokeWidth="8" />
      <path
        d="M213 149h42v29h-42z"
        fill="none"
        stroke="#e7edda"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      <path d="M210 146h48" stroke="#e7edda" strokeWidth="3" />
      <g fill="#6a7b54" transform="rotate(-22 329 226)">
        <ellipse cx="321" cy="218" rx="4" ry="7" />
        <ellipse cx="334" cy="231" rx="4" ry="7" />
        <ellipse cx="350" cy="222" rx="3" ry="6" />
      </g>
      <g transform="translate(87 205)">
        <ellipse cy="-9" rx="20" ry="23" fill="#f3ead4" />
        <ellipse cx="-11" cy="-37" rx="6" ry="22" fill="#f3ead4" />
        <ellipse cx="8" cy="-36" rx="6" ry="22" fill="#f3ead4" />
        <path d="M-23 32q0-33 23-30t23 30" fill="#617e69" />
        <circle cx="-6" cy="-12" r="2" fill="#354634" />
        <circle cx="7" cy="-12" r="2" fill="#354634" />
      </g>
      <g transform="translate(359 190)">
        <circle cx="-14" cy="-33" r="9" fill="#9b7953" />
        <circle cx="15" cy="-33" r="9" fill="#9b7953" />
        <ellipse cy="-15" rx="25" ry="28" fill="#aa8861" />
        <ellipse cy="18" rx="31" ry="29" fill="#aa8861" />
        <ellipse cy="-7" rx="12" ry="9" fill="#d3b48b" />
        <circle cx="-8" cy="-22" r="2" fill="#3c392f" />
        <circle cx="8" cy="-22" r="2" fill="#3c392f" />
      </g>
    </svg>
  );
}
