// Single source of truth for level calculation.
// All pages MUST import from here — never define thresholds locally.
export const LEVEL_THRESHOLDS = [0, 500, 2_000, 5_000, 10_000, 99_999]

export function calcLevel(earned: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--)
    if (earned >= LEVEL_THRESHOLDS[i]) return i + 1
  return 1
}

export function levelProgress(earned: number): number {
  const lvl = calcLevel(earned)
  const from = LEVEL_THRESHOLDS[lvl - 1] ?? 0
  const to   = LEVEL_THRESHOLDS[lvl]     ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  return to > from ? Math.min(100, ((earned - from) / (to - from)) * 100) : 100
}

export function nextLevelAt(earned: number): number {
  const lvl = calcLevel(earned)
  return LEVEL_THRESHOLDS[lvl] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
}
