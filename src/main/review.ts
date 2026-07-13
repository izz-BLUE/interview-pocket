export interface ReviewProgressSnapshot {
  review_count?: number
  wrong_count?: number
  mastery_score?: number
}

export interface ReviewSchedule {
  interval: number
  nextDateStr: string
  todayStr: string
  wrongCount: number
  masteryScore: number
}

const SCORE_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 1,
  3: 3,
  4: 7,
  5: 15
}

export function calculateReviewSchedule(
  existing: ReviewProgressSnapshot | null,
  score: number,
  nowStr: string
): ReviewSchedule {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new RangeError('Score must be an integer between 1 and 5')
  }

  const now = new Date(nowStr)
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Invalid review time')
  }

  const interval = SCORE_INTERVAL_DAYS[score]
  const nextDate = new Date(now)
  nextDate.setDate(nextDate.getDate() + interval)

  const currentMastery = score * 20
  const previousMastery = existing?.mastery_score || 0
  const masteryScore = existing && (existing.review_count || 0) > 0
    ? Math.round(previousMastery * 0.7 + currentMastery * 0.3)
    : currentMastery

  return {
    interval,
    nextDateStr: nextDate.toISOString(),
    todayStr: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    wrongCount: (existing?.wrong_count || 0) + (score <= 2 ? 1 : 0),
    masteryScore
  }
}
