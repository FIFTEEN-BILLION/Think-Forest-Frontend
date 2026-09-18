import { useEffect, useRef, useState } from 'react';
import type { Model } from '../api/schema';

export function ProgressChart({ points }: { points: Model<'TimelinePoint'>[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(220, entry.contentRect.width));
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(1, ...points.map((point) => point.responses));
  const right = width - 28;
  const x = (i: number) => 38 + (i * (right - 38)) / Math.max(1, points.length - 1);
  const y = (value: number) => 210 - (value / max) * 164;
  return (
    <div className="progress-chart" ref={container}>
      <svg
        viewBox={`0 0 ${width} 250`}
        role="img"
        aria-label="날짜별 내 답변 수. 자세한 수치는 날짜별 기록에서 볼 수 있어요."
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line x1="38" x2={right} y1={y(max * ratio)} y2={y(max * ratio)} stroke="var(--line)" />
            <text
              x="26"
              y={y(max * ratio) + 5}
              textAnchor="end"
              fill="var(--ink-500)"
              fontSize="13"
            >
              {Math.round(max * ratio)}
            </text>
          </g>
        ))}
        <polyline
          points={points.map((point, i) => `${x(i)},${y(point.responses)}`).join(' ')}
          fill="none"
          stroke="var(--teal)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {points.map((point, i) => (
          <g key={point.date}>
            <circle cx={x(i)} cy={y(point.responses)} r="4" fill="var(--teal)">
              <title>
                {point.date}: 답변 {point.responses}회
              </title>
            </circle>
            {(i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)) && (
              <text x={x(i)} y="236" textAnchor="middle" fill="var(--ink-500)" fontSize="13">
                {point.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="legend">
        <span>🌱 내가 남긴 답변</span>
      </div>
    </div>
  );
}
