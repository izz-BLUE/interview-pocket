export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  count?: number
  total?: number
}

export type ReviewStatus =
  | 'ALL'
  | 'UNREVIEWED'
  | 'REVIEWED'
  | 'WRONG'
  | 'LOW_MASTERY'
  | 'MASTERED'

export interface QuestionSummary {
  id: number
  title: string
  category: string | null
  source_file: string | null
  created_at: string
  mastery_score?: number
  wrong_count?: number
  review_count?: number
  last_review_date?: string | null
}

export interface SearchResult {
  id: number
  title: string
  category: string | null
  source_file: string | null
  created_at: string
  score: number
  matchField: 'title' | 'memory_point' | 'standard_answer' | 'raw_markdown'
  matchSnippet: string
  matchedTerms: string[]
  matchRatio: number
  mastery_score?: number
  wrong_count?: number
  review_count?: number
  last_review_date?: string | null
}

export interface QuestionDetail {
  id: number
  title: string
  category: string | null
  source_heading_path: string | null
  standard_answer: string | null
  short_answer: string | null
  deep_answer: string | null
  memory_point: string | null
  follow_ups: string | null
  warnings: string | null
  raw_markdown: string | null
  source_file: string | null
  created_at: string
  updated_at: string
}

export interface StatsData {
  total: number
  todayReviewed: number
  todayDue: number
  reviewedTotal?: number
  unreviewedTotal?: number
  wrongQuestionCount?: number
  lowMasteryCount?: number
  avgMasteryReviewed?: number
}

export interface QuestionSource {
  source_file: string
  count: number
}

export interface CramQuestionSummary {
  id: number
  title: string
  category: string | null
  source_file: string | null
  memory_point: string | null
}

export interface ImportReport {
  sourceFile: string
  parsedCount: number
  insertedCount: number
  duplicatedCount: number
  updatedCount: number
  answerStats: {
    standardAnswerCount: number
    shortAnswerCount: number
    deepAnswerCount: number
    memoryPointCount: number
    followUpCount: number
    warningCount: number
  }
  noAnswerQuestions: Array<{
    title: string
    category: string | null
  }>
  duplicatedQuestions: Array<{
    title: string
    category: string | null
  }>
  insertedQuestionIds: number[]
}

export interface QuestionReviewInfo {
  progress: {
    review_count: number
    wrong_count: number
    mastery_score: number
    last_review_date: string | null
    next_review_date: string | null
    interval_days: number | null
  } | null
  records: Array<{
    id: number
    score: number
    review_date: string
  }>
}

export interface WrongQuestionSummary {
  id: number
  title: string
  category: string | null
  source_file: string | null
  wrong_count: number
  mastery_score: number
  last_review_date: string | null
}

export interface DeleteQuestionSourceResult {
  sourceFile: string
  deletedQuestionCount: number
  deletedReviewRecordCount: number
  deletedProgressCount: number
}

export interface ElectronAPI {
  importMarkdownFile: (filePath?: string) => Promise<ApiResponse>
  listQuestions: (params?: { limit?: number; offset?: number; sourceFile?: string | null; reviewStatus?: ReviewStatus }) => Promise<ApiResponse<QuestionSummary[]>>
  searchQuestions: (keyword: string, params?: { sourceFile?: string | null; reviewStatus?: ReviewStatus }) => Promise<ApiResponse<SearchResult[]>>
  getQuestionById: (id: number) => Promise<ApiResponse<QuestionDetail>>
  submitReview: (questionId: number, score: number) => Promise<ApiResponse>
  getStats: () => Promise<ApiResponse<StatsData>>
  getDueQuestions: () => Promise<ApiResponse<QuestionSummary[]>>
  getQuestionSources: () => Promise<ApiResponse<QuestionSource[]>>
  getCramQuestions: (params?: { sourceFile?: string | null; limit?: number }) => Promise<ApiResponse<CramQuestionSummary[]>>
  getWrongQuestions: () => Promise<ApiResponse<WrongQuestionSummary[]>>
  resetWrongCount: (questionId: number) => Promise<ApiResponse>
  getQuestionReviewInfo: (questionId: number) => Promise<ApiResponse<QuestionReviewInfo>>
  deleteQuestionSource: (sourceFile: string) => Promise<ApiResponse<DeleteQuestionSourceResult>>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
