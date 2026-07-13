import { safeLog } from './logger'

export interface ParsedQuestion {
  title: string
  category?: string
  source_heading_path?: string
  standard_answer?: string
  short_answer?: string
  deep_answer?: string
  memory_point?: string
  follow_ups?: string[]
  warnings?: string[]
  raw_markdown?: string
  tags?: string[]
}

// 字段类型
type FieldType = 'standard_answer' | 'short_answer' | 'deep_answer' | 'memory_point' | 'follow_ups' | 'warnings' | null

// 排除的标题列表
const EXCLUDED_TITLES = [
  '当前面试定位',
  '当前核心人设',
  '当前项目最新状态',
  '你的求职定位',
  '当前项目状态口径',
  '如何使用这份手册',
  '三层复习法',
  '最终禁忌清单',
  '不能这么说',
  '应该这么说',
  '每日复习计划',
  '面试前最后 10 句',
  '最后一页',
]

// 排除的标题模式
const EXCLUDED_PATTERNS = [
  /^Day\s+\d+/i,
  /^第[一二三四五六七八九十]+天/,
  /^P\d+\s*[-—]\s*项目/,  // P0 - 项目xxx
]

/**
 * 将 Markdown 文本解析为题目列表
 * 使用 line-based parser，更稳定地处理各种格式
 */
export function parseMarkdown(content: string, sourceFile?: string): ParsedQuestion[] {
  const lines = content.split('\n')
  const questions: ParsedQuestion[] = []

  let currentQuestion: ParsedQuestion | null = null
  let currentField: FieldType = null
  let fieldContent: string[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let currentHeadingPath: string[] = []  // 记录上级标题路径

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 处理代码块
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // 结束代码块
        inCodeBlock = false
        const blockContent = codeBlockContent.join('\n')
        if (currentField && blockContent) {
          fieldContent.push(blockContent)
        } else if (currentQuestion && blockContent) {
          // 如果没有指定字段，添加到 raw_markdown
          currentQuestion.raw_markdown = (currentQuestion.raw_markdown || '') + blockContent + '\n'
        }
        codeBlockContent = []
      } else {
        // 开始代码块
        inCodeBlock = true
        codeBlockContent = []
      }
      continue
    }

    // 在代码块内，收集内容
    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // 统一识别 H1-H6，避免把 H3-H6 字段判断放进 H1/H2 分支后永远无法命中
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const headingLevel = headingMatch[1].length
      const headingText = headingMatch[2].trim()

      // 更新标题路径
      if (headingLevel === 1) {
        currentHeadingPath = [headingText]
      } else if (headingLevel === 2) {
        // 检查是否是新题目
        if (isQuestionTitle(headingText, currentHeadingPath)) {
          // 保存上一题
          if (currentQuestion) {
            finalizeQuestion(currentQuestion, fieldContent, currentField)
            questions.push(currentQuestion)
          }

          // 创建新题目
          currentQuestion = {
            title: cleanTitle(headingText),
            category: currentHeadingPath.length > 0 ? currentHeadingPath[0] : undefined,
            source_heading_path: currentHeadingPath.join(' > '),
            raw_markdown: line + '\n'
          }
          currentField = null
          fieldContent = []
          continue
        }
      }

      // 检查是否是字段标题（H3-H6）
      if (headingLevel >= 3) {
        const fieldText = headingText

        // 检查字段类型
        const fieldType = detectFieldType(fieldText)
        if (fieldType && currentQuestion) {
          // 保存上一个字段
          finalizeQuestion(currentQuestion, fieldContent, currentField)

          // 开始新字段
          currentField = fieldType
          fieldContent = []
          continue
        }
      }
    }

    // 检查加粗格式的字段标题
    if (/^\*\*[^*]+[：:]\*\*/.test(trimmed)) {
      const fieldText = trimmed.replace(/^\*\*/, '').replace(/[：:]\*\*$/, '')
      const fieldType = detectFieldType(fieldText)
      if (fieldType && currentQuestion) {
        // 保存上一个字段
        finalizeQuestion(currentQuestion, fieldContent, currentField)

        // 开始新字段
        currentField = fieldType
        fieldContent = []
        continue
      }
    }

    // 普通内容行
    if (currentQuestion) {
      if (currentField) {
        fieldContent.push(line)
      } else {
        // 没有指定字段，添加到 raw_markdown
        currentQuestion.raw_markdown = (currentQuestion.raw_markdown || '') + line + '\n'
      }
    }
  }

  // 保存最后一题
  if (currentQuestion) {
    finalizeQuestion(currentQuestion, fieldContent, currentField)
    questions.push(currentQuestion)
  }

  // 后处理：如果 standard_answer 为空，尝试从 raw_markdown 提取
  for (const q of questions) {
    if (!q.standard_answer && q.raw_markdown) {
      // 尝试从 raw_markdown 提取内容作为 fallback
      const fallback = extractFallbackAnswer(q.raw_markdown)
      if (fallback) {
        q.standard_answer = fallback
      }
    }
  }

  // 打印简化的日志
  safeLog(`Parsed ${questions.length} questions from ${sourceFile || 'unknown'}`)

  return questions
}

/**
 * 检测字段类型
 */
function detectFieldType(text: string): FieldType {
  // 标准答案
  if (/^推荐回答/.test(text) || /^参考回答/.test(text)) {
    return 'standard_answer'
  }

  // 简短回答
  if (/^简短回答/.test(text)) {
    return 'short_answer'
  }

  // 深入回答
  if (/^深入回答/.test(text) || /^详细回答/.test(text)) {
    return 'deep_answer'
  }

  // 记忆锚点
  if (/^一句话锚点/.test(text) || /^核心句/.test(text) || /^一句话版/.test(text)) {
    return 'memory_point'
  }

  // 追问
  if (/^追问点/.test(text) || /^可能追问/.test(text)) {
    return 'follow_ups'
  }

  // 风险提示
  if (/^禁忌说法/.test(text) || /^注意/.test(text) || /^不要说/.test(text) || /^不能这么说/.test(text)) {
    return 'warnings'
  }

  return null
}

/**
 * 完成当前字段，保存到题目对象
 */
function finalizeQuestion(question: ParsedQuestion, fieldContent: string[], fieldType: FieldType): void {
  if (!fieldType || fieldContent.length === 0) return

  const text = fieldContent.join('\n').trim()
  if (!text) return

  switch (fieldType) {
    case 'standard_answer':
      question.standard_answer = text
      break
    case 'short_answer':
      question.short_answer = text
      break
    case 'deep_answer':
      question.deep_answer = text
      break
    case 'memory_point':
      question.memory_point = text
      break
    case 'follow_ups':
      question.follow_ups = parseListItems(text)
      break
    case 'warnings':
      question.warnings = parseListItems(text)
      break
  }
}

/**
 * 解析列表项
 */
function parseListItems(text: string): string[] {
  const items: string[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      items.push(trimmed.substring(2).trim())
    } else if (trimmed && !trimmed.startsWith('#')) {
      items.push(trimmed)
    }
  }

  return items
}

/**
 * 判断是否是题目标题
 */
function isQuestionTitle(title: string, headingPath: string[]): boolean {
  // 先检查排除列表
  if (EXCLUDED_TITLES.includes(title)) {
    return false
  }

  // 检查排除模式
  if (EXCLUDED_PATTERNS.some(pattern => pattern.test(title))) {
    return false
  }

  // 强题目规则：明确的编号格式
  const strongPatterns = [
    /^P\d+[-.]\d+\.\s+/,      // P0-1. xxx 或 P0.1. xxx
    /^Q\d+[.：:]\s*/,          // Q1. xxx 或 Q1：xxx
    /^J\d+\.\s+/,              // J1. xxx
    /^B\d+\.\s+/,              // B1. xxx
    /^\d+\.\d+\s+/,            // 1.1 xxx
  ]

  if (strongPatterns.some(pattern => pattern.test(title))) {
    return true
  }

  // 弱题目规则：包含疑问词
  const questionPatterns = [
    /为什么/,
    /什么/,
    /怎么/,
    /如何/,
    /区别/,
    /是否/,
    /如果/,
    /能否/,
    /会不会/,
    /是不是/,
    /What/i,
    /Why/i,
    /How/i,
    /When/i,
    /Where/i,
    /Can\s+/i,
    /Do\s+/i,
    /Is\s+/i,
    /Are\s+/i,
  ]

  // 只有包含疑问词的标题才可能是弱题目
  if (questionPatterns.some(pattern => pattern.test(title))) {
    // 弱题目需要在后续内容中有推荐回答等字段标记
    // 这里暂时返回 true，在 parseMarkdown 中会进一步验证
    return true
  }

  return false
}

/**
 * 清理标题，移除编号前缀
 */
function cleanTitle(title: string): string {
  return title
    .replace(/^P\d+[-.]\d+\.\s*/, '')
    .replace(/^[A-Z]\d+[.：:]\s*/, '')
    .replace(/^\d+\.\d+\s*/, '')
    .replace(/^\d+\.\s+/, '')
    .trim()
}

/**
 * 从 raw_markdown 提取 fallback 答案
 */
function extractFallbackAnswer(rawMarkdown: string): string | null {
  // 移除标题行
  const lines = rawMarkdown.split('\n')
  const contentLines = lines.filter(line => !line.trim().startsWith('#'))

  const content = contentLines.join('\n').trim()
  if (content.length > 10) {
    return content
  }

  return null
}
