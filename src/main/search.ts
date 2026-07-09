import { queryAll } from './database'

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

/**
 * 搜索题目，按相关性排序
 */
export function searchQuestions(keyword: string, options?: { sourceFile?: string | null }): SearchResult[] {
  const effectiveSource = (!options?.sourceFile || options.sourceFile === 'ALL') ? null : options.sourceFile

  // 1. 获取所有题目
  const allQuestions = queryAll(`
    SELECT id, title, category, source_file, created_at, standard_answer, short_answer, deep_answer, memory_point, raw_markdown
    FROM questions
    WHERE (? IS NULL OR source_file = ?)
  `, [effectiveSource, effectiveSource])

  // 2. 处理搜索词
  const { originalKeyword, terms } = normalizeKeyword(keyword)

  if (terms.length === 0) {
    return []
  }

  // 3. 计算每道题的相关性分数
  const results: SearchResult[] = []

  for (const q of allQuestions) {
    const scoreResult = calculateScore(q, originalKeyword, terms)

    if (scoreResult.score > 0) {
      results.push({
        id: q.id,
        title: q.title,
        category: q.category,
        source_file: q.source_file,
        created_at: q.created_at,
        score: scoreResult.score,
        matchField: scoreResult.matchField,
        matchSnippet: scoreResult.matchSnippet,
        matchedTerms: scoreResult.matchedTerms,
        matchRatio: scoreResult.matchRatio
      })
    }
  }

  // 4. 排序：score DESC, matchRatio DESC, id ASC
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.matchRatio !== a.matchRatio) return b.matchRatio - a.matchRatio
    return a.id - b.id
  })

  // 5. 限制返回数量
  return results.slice(0, 100)
}

/**
 * 处理搜索关键词
 */
function normalizeKeyword(keyword: string): { originalKeyword: string; terms: string[] } {
  const originalKeyword = keyword.trim()

  // 转小写，替换分隔符为空格
  const normalized = originalKeyword
    .toLowerCase()
    .replace(/[+,，|/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 分词
  const terms = normalized.split(' ').filter(t => t.length > 0)

  return { originalKeyword, terms }
}

/**
 * 计算题目与搜索词的相关性分数
 */
function calculateScore(
  question: any,
  originalKeyword: string,
  terms: string[]
): {
  score: number
  matchField: SearchResult['matchField']
  matchSnippet: string
  matchedTerms: string[]
  matchRatio: number
} {
  const title = question.title || ''
  const titleLower = title.toLowerCase()
  const memoryPoint = question.memory_point || ''
  const memoryPointLower = memoryPoint.toLowerCase()
  const standardAnswer = question.standard_answer || ''
  const standardAnswerLower = standardAnswer.toLowerCase()
  const shortAnswer = question.short_answer || ''
  const shortAnswerLower = shortAnswer.toLowerCase()
  const deepAnswer = question.deep_answer || ''
  const deepAnswerLower = deepAnswer.toLowerCase()
  const rawMarkdown = question.raw_markdown || ''
  const rawMarkdownLower = rawMarkdown.toLowerCase()
  const originalLower = originalKeyword.toLowerCase()

  let maxScore = 0
  let matchField: SearchResult['matchField'] = 'raw_markdown'
  let matchSnippet = ''
  let bestMatchedTerms: string[] = []

  // 辅助函数：计算匹配的 terms
  function getMatchedTerms(textLower: string): string[] {
    return terms.filter(term => textLower.includes(term))
  }

  // 辅助函数：更新最佳匹配
  function updateBest(score: number, field: SearchResult['matchField'], snippet: string, matchedTerms: string[]) {
    if (score > maxScore) {
      maxScore = score
      matchField = field
      matchSnippet = snippet
      bestMatchedTerms = matchedTerms
    }
  }

  // 1. title 完全等于 keyword，score + 1000
  if (titleLower === originalLower) {
    return {
      score: 1000,
      matchField: 'title',
      matchSnippet: title,
      matchedTerms: terms,
      matchRatio: 1
    }
  }

  // 2. title 包含完整 keyword，score + 850
  if (titleLower.includes(originalLower)) {
    updateBest(850, 'title', title, terms)
  }

  // 3. title 包含所有 query terms，score + 700
  const titleMatchedTerms = getMatchedTerms(titleLower)
  if (titleMatchedTerms.length === terms.length) {
    updateBest(700, 'title', title, titleMatchedTerms)
  }

  // 4. memory_point 包含所有 query terms，score + 450
  const memoryMatchedTerms = getMatchedTerms(memoryPointLower)
  if (memoryMatchedTerms.length === terms.length) {
    updateBest(450, 'memory_point', extractSnippet(memoryPoint, originalKeyword), memoryMatchedTerms)
  }

  // 5. standard_answer 包含所有 query terms，score + 350
  const answerMatchedTerms = getMatchedTerms(standardAnswerLower)
  if (answerMatchedTerms.length === terms.length) {
    updateBest(350, 'standard_answer', extractSnippet(standardAnswer, originalKeyword), answerMatchedTerms)
  }

  // 6. deep_answer 包含所有 query terms，score + 300
  const deepMatchedTerms = getMatchedTerms(deepAnswerLower)
  if (deepMatchedTerms.length === terms.length) {
    updateBest(300, 'standard_answer', extractSnippet(deepAnswer, originalKeyword), deepMatchedTerms)
  }

  // 7. short_answer 包含所有 query terms，score + 300
  const shortMatchedTerms = getMatchedTerms(shortAnswerLower)
  if (shortMatchedTerms.length === terms.length) {
    updateBest(300, 'standard_answer', extractSnippet(shortAnswer, originalKeyword), shortMatchedTerms)
  }

  // 8. title 包含任意 query term
  if (titleMatchedTerms.length > 0) {
    let score: number
    if (terms.length === 1) {
      score = 400
    } else {
      score = titleMatchedTerms.length * 120
    }
    updateBest(score, 'title', title, titleMatchedTerms)
  }

  // 9. memory_point 包含任意 query term：每命中一个 term + 80
  if (memoryMatchedTerms.length > 0) {
    const score = memoryMatchedTerms.length * 80
    updateBest(score, 'memory_point', extractSnippet(memoryPoint, originalKeyword), memoryMatchedTerms)
  }

  // 10. standard_answer 包含任意 query term：每命中一个 term + 50
  if (answerMatchedTerms.length > 0) {
    const score = answerMatchedTerms.length * 50
    updateBest(score, 'standard_answer', extractSnippet(standardAnswer, originalKeyword), answerMatchedTerms)
  }

  // 11. raw_markdown 兜底：+ 10
  if (maxScore === 0 && rawMarkdownLower.includes(originalLower)) {
    updateBest(10, 'raw_markdown', extractSnippet(rawMarkdown, originalKeyword), [originalKeyword])
  }

  // 计算 matchRatio
  const matchRatio = terms.length > 0 ? bestMatchedTerms.length / terms.length : 0

  return {
    score: maxScore,
    matchField,
    matchSnippet,
    matchedTerms: bestMatchedTerms,
    matchRatio
  }
}

/**
 * 提取关键词附近的文本片段
 */
function extractSnippet(text: string, keyword: string, maxLength: number = 80): string {
  if (!text) return ''

  const lower = text.toLowerCase()
  const keywordLower = keyword.toLowerCase()
  const index = lower.indexOf(keywordLower)

  if (index === -1) {
    // 如果找不到关键词，返回前 maxLength 个字符
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // 计算起始位置，让关键词尽量居中
  const start = Math.max(0, index - Math.floor(maxLength / 2))
  const end = Math.min(text.length, start + maxLength)

  let snippet = text.substring(start, end)

  // 如果不是从头开始，加省略号
  if (start > 0) {
    snippet = '...' + snippet
  }

  // 如果不是到结尾，加省略号
  if (end < text.length) {
    snippet = snippet + '...'
  }

  return snippet
}
