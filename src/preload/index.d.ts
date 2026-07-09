export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  count?: number
  total?: number
}

export interface QuestionSummary {
  id: number
  title: string
  category: string | null
  source_file: string | null
  created_at: string
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

export interface ElectronAPI {
  importMarkdownFile: (filePath?: string) => Promise<ApiResponse>
  listQuestions: (params?: { limit?: number; offset?: number }) => Promise<ApiResponse<QuestionSummary[]>>
  searchQuestions: (keyword: string) => Promise<ApiResponse<SearchResult[]>>
  getQuestionById: (id: number) => Promise<ApiResponse<QuestionDetail>>
  submitReview: (questionId: number, score: number) => Promise<ApiResponse>
  getStats: () => Promise<ApiResponse<StatsData>>
  getDueQuestions: () => Promise<ApiResponse<QuestionSummary[]>>
  getWrongQuestions: () => Promise<ApiResponse<WrongQuestionSummary[]>>
  resetWrongCount: (questionId: number) => Promise<ApiResponse>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
