import type { Draft } from '../types';
export function Simulation({ lab }: { lab: Draft['lab'] }) {
  const n = lab.value;
  return lab.mode === 'balance' ? (
    <svg viewBox="0 0 380 175" role="img" aria-label={`왼쪽 ${n}그램과 오른쪽 50그램의 모형 저울`}>
      <path d="m170 151 20-69 20 69Z" fill="#a6b797" />
      <g transform={`rotate(${(50 - n) / 4} 190 66)`}>
        <path d="M65 66h250" stroke="#60816d" strokeWidth="7" />
        <path d="M65 66v57M315 66v57" stroke="#8b9e8a" strokeWidth="2" />
        <path d="M31 123q34 34 68 0ZM281 123q34 34 68 0Z" fill="#7caa90" />
        <rect x="48" y="99" width="34" height="24" rx="4" fill="#cda56a" />
        <rect x="298" y="99" width="34" height="24" rx="4" fill="#cda56a" />
      </g>
      <circle cx="190" cy="66" r="7" fill="#e3c88c" />
    </svg>
  ) : (
    <svg viewBox="0 0 380 175" role="img" aria-label={`빛의 높이 ${n}인 그림자 모형`}>
      <path d="M20 145h340" stroke="#a3b99a" strokeWidth="2" />
      <ellipse cx={195 + (115 - n) / 2} cy="145" rx={115 - n} ry="8" fill="#708b67" opacity=".3" />
      <path d="M195 143v-66" stroke="#b39766" strokeWidth="12" />
      <circle cx="65" cy={115 - n} r="17" fill="#e5c577" />
      <path
        d={`M82 ${115 - n} 195 77l${115 - n} 66`}
        fill="none"
        stroke="#d4bc70"
        strokeWidth="2"
        strokeDasharray="5 5"
      />
    </svg>
  );
}
export function StageArt({
  scene,
  activityId = 'kindness',
}: {
  scene: number;
  activityId?: string;
}) {
  return (
    <svg viewBox="0 0 480 300" role="img" aria-label={`토끼와 곰의 이야기, ${scene + 1}번째 장면`}>
      <path fill="#e9e7d4" d="M0 0h480v300H0z" />
      <circle cx="380" cy="51" r="24" fill="#f7ecc4" />
      <path d="M0 178q137-90 247-16t233-19v157H0" fill="#b2c79f" />
      <path d="M0 224q109-66 246-3t234-19v98H0" fill="#91ac82" />
      {activityId === 'kindness' ? (
        <>
          <path d="M212 166q77 24 37 60t70 74h77q-123-50-96-66t-27-68" fill="#b3d0cb" />
          <path d="m191 235 124-17" stroke="#aa8860" strokeWidth="17" strokeLinecap="round" />
        </>
      ) : activityId === 'courage' ? (
        <>
          <path d="M40 238h400v40H40Z" fill="#ab8064" />
          <path d="M45 5v160L90 5M435 5v160L390 5" fill="#be8e7a" />
          <path d="M234 203v-52h17v15h-17" stroke="#556948" strokeWidth="4" fill="none" />
        </>
      ) : (
        <>
          <path d="M221 100h80v105h-80Z" fill="#f7efdb" />
          <path d="M230 174q26-53 60 0" stroke="#789963" strokeWidth="15" fill="none" />
          <path d="m218 240 25-40m65 40-25-40" stroke="#987651" strokeWidth="5" />
        </>
      )}
      <g transform={`translate(${scene < 2 ? 135 : 190} 183)`}>
        <g className="character">
          <ellipse cy="-12" rx="23" ry="24" fill="#f6edda" />
          <ellipse cx="-12" cy="-42" rx="7" ry="24" fill="#f6edda" />
          <ellipse cx="10" cy="-42" rx="7" ry="24" fill="#f6edda" />
          <path d="M-25 43q0-38 25-34t25 34" fill="#cb9779" />
          <circle cx="-8" cy="-17" r="2" fill="#3d4c35" />
          <circle cx="8" cy="-17" r="2" fill="#3d4c35" />
          <path d="M-3-9q3 4 6 0" fill="none" stroke="#ab8469" strokeWidth="2" />
        </g>
      </g>
      <g transform={`translate(${scene < 2 ? 349 : 325} 183)`}>
        <g className="character">
          <circle cx="-16" cy="-39" r="10" fill="#a0815a" />
          <circle cx="16" cy="-39" r="10" fill="#a0815a" />
          <ellipse cy="-19" rx="29" ry="30" fill="#b6946b" />
          <ellipse cy="23" rx="34" ry="30" fill="#b6946b" />
          <ellipse cy="-11" rx="14" ry="11" fill="#dac09a" />
          <circle cx="-9" cy="-25" r="2" fill="#3f3c30" />
          <circle cx="9" cy="-25" r="2" fill="#3f3c30" />
          <path d="M-20 13q20 13 40 0v32h-40" fill="#708d7c" />
        </g>
      </g>
      <g fill="#698952">
        <ellipse cx="47" cy="138" rx="26" ry="45" />
        <ellipse cx="440" cy="122" rx="35" ry="49" />
      </g>
      <g stroke="#69805a" strokeWidth="6">
        <path d="M47 146v60M440 130v60" />
      </g>
    </svg>
  );
}
