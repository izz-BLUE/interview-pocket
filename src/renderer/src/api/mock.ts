import type { ElectronAPI, QuestionDetail, QuestionSummary } from '../../../preload/index.d'

const questions: QuestionSummary[] = [
  { id: 1, title: 'MySQL 的 MVCC 是如何实现的？', category: 'MySQL', source_file: 'java-backend.md', created_at: '', mastery_score: 82, review_count: 4, wrong_count: 0 },
  { id: 2, title: 'Redis 缓存击穿、穿透和雪崩有什么区别？', category: 'Redis', source_file: 'java-backend.md', created_at: '', mastery_score: 56, review_count: 2, wrong_count: 1 },
  { id: 3, title: '如何保证消息队列消费的幂等性？', category: '系统设计', source_file: 'project.md', created_at: '', mastery_score: 0, review_count: 0, wrong_count: 0 }
]

const detail: QuestionDetail = {
  id: 1,
  title: questions[0].title,
  category: 'MySQL',
  source_heading_path: 'Java 后端 > MySQL',
  standard_answer: 'MVCC 通过隐藏字段、Undo Log 和 Read View 实现一致性非锁定读。',
  short_answer: '核心是版本链与可见性判断。',
  deep_answer: '每行记录包含事务版本信息，快照读根据 Read View 判断版本是否可见。',
  memory_point: '版本链 + Read View + Undo Log',
  follow_ups: JSON.stringify(['当前读和快照读有什么区别？']),
  warnings: JSON.stringify(['不要把 MVCC 说成完全不加锁。']),
  raw_markdown: null,
  source_file: 'java-backend.md',
  created_at: '',
  updated_at: ''
}

export const mockApi: ElectronAPI = {
  importMarkdownFile: async () => ({ success: false, error: '浏览器预览模式不支持选择本地文件' }),
  listQuestions: async () => ({ success: true, data: questions, total: questions.length }),
  searchQuestions: async () => ({ success: true, data: [] }),
  getQuestionById: async () => ({ success: true, data: detail }),
  submitReview: async (questionId, score) => ({ success: true, data: { questionId, score } }),
  getStats: async () => ({ success: true, data: { total: 155, todayReviewed: 8, todayDue: 12, reviewedTotal: 96, unreviewedTotal: 59, wrongQuestionCount: 7, lowMasteryCount: 14, avgMasteryReviewed: 74 } }),
  getDueQuestions: async () => ({ success: true, data: questions }),
  getQuestionSources: async () => ({ success: true, data: [
    { source_key: 'preview-java', source_file: 'java-backend.md', display_name: 'java-backend.md', count: 108 },
    { source_key: 'preview-project', source_file: 'project.md', display_name: 'project.md', count: 47 }
  ] }),
  getCramQuestions: async () => ({ success: true, data: questions.map(({ id, title, category, source_file }) => ({ id, title, category, source_file, memory_point: '快速回忆核心概念' })) }),
  getWrongQuestions: async () => ({ success: true, data: [{ ...questions[1], wrong_count: 2, mastery_score: 48, last_review_date: null }] }),
  resetWrongCount: async () => ({ success: true }),
  getQuestionReviewInfo: async () => ({ success: true, data: { progress: { review_count: 4, wrong_count: 0, mastery_score: 82, last_review_date: '2026-07-12', next_review_date: '2026-07-20', interval_days: 7 }, records: [] } }),
  deleteQuestionSource: async () => ({ success: false, error: '浏览器预览模式不执行删除' })
}
