export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function isReviewScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}

export function normalizeSourceFilter(value?: string | null): string | null {
  if (!value || value === 'ALL') return null
  const trimmed = value.trim()
  return trimmed || null
}
