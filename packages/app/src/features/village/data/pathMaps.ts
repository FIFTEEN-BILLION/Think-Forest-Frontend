import type { PathMap } from '../types';

// Cells are numbered row by row on a 5×5 grid: 0 is top-left, 24 is bottom-right.
// 티키 starts at the bottom facing up; one puddle blocks the straight road to the post office.
// Challenge maps are derived from this one by lib/path.ts challengeCandidates.
export const FIRST_MAP: PathMap = { id: 'm1', start: 22, heading: 'up', goal: 14, puddles: [7] };
