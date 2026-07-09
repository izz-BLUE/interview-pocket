import { ipcMain, dialog } from 'electron'
import { queryAll, queryOne, runSql } from './database'
import { parseMarkdown } from './markdown'
import { searchQuestions } from './search'
import { safeLog, safeError } from './logger'
import fs from 'fs'
import path from 'path'

export function registerIpcHandlers(): void {
  // 导入 Markdown 文件
  ipcMain.handle('importMarkdownFile', async (_event, filePath?: string) => {
    try {
      let targetPath = filePath

      // 如果没有提供文件路径，打开文件选择对话框
      if (!targetPath) {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            { name: 'Markdown', extensions: ['md', 'markdown'] }
          ]
        })

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: 'No file selected' }
        }
        targetPath = result.filePaths[0]
      }

      // 读取文件内容
      const content = fs.readFileSync(targetPath, 'utf-8')
      const fileName = path.basename(targetPath)

      // 解析 Markdown
      const parsedQuestions = parseMarkdown(content, fileName)

      // 保存到数据库
      const insertQuestionSql = `
        INSERT INTO questions (title, category, source_heading_path, standard_answer, short_answer, deep_answer, memory_point, follow_ups, warnings, raw_markdown, source_file)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const insertProgressSql = `
        INSERT OR IGNORE INTO review_progress (question_id, review_count, next_review_date)
        VALUES (?, 0, datetime('now'))
      `

      let count = 0
      let duplicatedCount = 0

      for (const q of parsedQuestions) {
        // 检查是否已存在相同题目（source_file + title）
        const existing = queryOne(
          'SELECT id FROM questions WHERE source_file = ? AND title = ?',
          [fileName, q.title]
        )

        if (existing) {
          duplicatedCount++
          continue
        }

        // 插入题目
        runSql(insertQuestionSql, [
          q.title,
          q.category || null,
          q.source_heading_path || null,
          q.standard_answer || null,
          q.short_answer || null,
          q.deep_answer || null,
          q.memory_point || null,
          q.follow_ups ? JSON.stringify(q.follow_ups) : null,
          q.warnings ? JSON.stringify(q.warnings) : null,
          q.raw_markdown || null,
          fileName
        ])

        // 通过 title + source_file 获取刚插入的题目 ID
        const insertedQuestion = queryOne(
          'SELECT id FROM questions WHERE source_file = ? AND title = ? ORDER BY id DESC LIMIT 1',
          [fileName, q.title]
        )

        if (insertedQuestion) {
          // 检查是否已有 review_progress 记录
          const existingProgress = queryOne(
            'SELECT id FROM review_progress WHERE question_id = ?',
            [insertedQuestion.id]
          )

          if (!existingProgress) {
            // 插入复习进度记录
            runSql(insertProgressSql, [insertedQuestion.id])
          }
        }

        count++
      }

      return { success: true, count, duplicatedCount }
    } catch (error) {
      safeError('Import failed:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取题目列表
  ipcMain.handle('listQuestions', (_event, params?: { limit?: number; offset?: number }) => {
    try {
      const limit = params?.limit || 100
      const offset = params?.offset || 0

      const questions = queryAll(`
        SELECT id, title, category, source_file, created_at
        FROM questions
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset])

      const totalResult = queryOne('SELECT COUNT(*) as count FROM questions')

      return { success: true, data: questions, total: totalResult?.count || 0 }
    } catch (error) {
      safeError('List questions failed:', error)
      return { success: false, error: String(error) }
    }
  })

  // 搜索题目（按相关性排序）
  ipcMain.handle('searchQuestions', (_event, keyword: string) => {
    try {
      const results = searchQuestions(keyword)
      return { success: true, data: results }
    } catch (error) {
      safeError('Search questions failed:', error)
      return { success: false, error: String(error) }
    }
  })

  // 根据 ID 获取题目详情
  ipcMain.handle('getQuestionById', (_event, id: number) => {
    try {
      const question = queryOne('SELECT * FROM questions WHERE id = ?', [id])

      if (!question) {
        return { success: false, error: 'Question not found' }
      }

      return { success: true, data: question }
    } catch (error) {
      safeError('Get question failed:', error)
      return { success: false, error: String(error) }
    }
  })

  // 提交复习评分
  ipcMain.handle('submitReview', (_event, questionId: number, score: number) => {
    try {
      // 获取今天的时间范围（本地时间）
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)

      const todayStartStr = todayStart.toISOString()
      const todayEndStr = todayEnd.toISOString()
      const nowStr = now.toISOString()

      // 检查今天是否已经复习过这道题
      const reviewedToday = queryOne(`
        SELECT COUNT(*) as count
        FROM review_records
        WHERE question_id = ?
          AND review_date >= ?
          AND review_date < ?
      `, [questionId, todayStartStr, todayEndStr])

      // 插入复习记录
      runSql(`
        INSERT INTO review_records (question_id, score, review_date)
        VALUES (?, ?, ?)
      `, [questionId, score, nowStr])

      // 更新复习进度
      const nextReviewAt = updateReviewProgress(questionId, score, nowStr)

      return {
        success: true,
        questionId,
        score,
        nextReviewAt,
        isFirstReviewToday: !reviewedToday || reviewedToday.count === 0
      }
    } catch (error) {
      safeError('Submit review failed:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取错题列表
  ipcMain.handle('getWrongQuestions', () => {
    try {
      const questions = queryAll(`
        SELECT
          q.id,
          q.title,
          q.category,
          q.source_file,
          rp.wrong_count,
          rp.mastery_score,
          rp.last_review_date
        FROM questions q
        INNER JOIN review_progress rp ON q.id = rp.question_id
        WHERE rp.wrong_count > 0
        ORDER BY rp.wrong_count DESC, rp.last_review_date ASC, q.id ASC
        LIMIT 100
      `)
      return { success: true, data: questions }
    } catch (error) {
      return safeError(error)
    }
  })

  // 重置错题计数
  ipcMain.handle('resetWrongCount', (_event, questionId: number) => {
    try {
      runSql(`
        UPDATE review_progress
        SET wrong_count = 0,
            mastery_score = CASE
              WHEN mastery_score < 80 THEN 80
              ELSE mastery_score
            END
        WHERE question_id = ?
      `, [questionId])
      saveDatabase()
      return { success: true, questionId }
    } catch (error) {
      return safeError(error)
    }
  })

  // 获取统计数据
  ipcMain.handle('getStats', () => {
    try {
      const totalQuestions = queryOne('SELECT COUNT(*) as count FROM questions')

      // 获取今天的时间范围（本地时间）
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)

      const todayStartStr = todayStart.toISOString()
      const todayEndStr = todayEnd.toISOString()

      // 今日已复习：今天有复习记录的题目数（按 question_id 去重）
      const todayReviewed = queryOne(`
        SELECT COUNT(DISTINCT question_id) as count
        FROM review_records
        WHERE review_date >= ?
          AND review_date < ?
      `, [todayStartStr, todayEndStr])

      // 今日待复习：到期题目 - 今天已复习题目
      const todayDue = queryOne(`
        SELECT COUNT(*) as count
        FROM review_progress rp
        WHERE
          (
            rp.review_count = 0
            OR datetime(rp.next_review_date) <= datetime('now')
          )
          AND NOT EXISTS (
            SELECT 1
            FROM review_records rr
            WHERE rr.question_id = rp.question_id
              AND rr.review_date >= ?
              AND rr.review_date < ?
          )
      `, [todayStartStr, todayEndStr])

      return {
        success: true,
        data: {
          total: totalQuestions?.count || 0,
          todayReviewed: todayReviewed?.count || 0,
          todayDue: todayDue?.count || 0
        }
      }
    } catch (error) {
      safeError('Get stats failed:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取今日待复习题目
  ipcMain.handle('getDueQuestions', () => {
    try {
      // 获取今天的时间范围（本地时间）
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)

      const todayStartStr = todayStart.toISOString()
      const todayEndStr = todayEnd.toISOString()

      const questions = queryAll(`
        SELECT q.id, q.title, q.category, rp.next_review_date
        FROM questions q
        INNER JOIN review_progress rp ON q.id = rp.question_id
        WHERE
          (
            rp.review_count = 0
            OR datetime(rp.next_review_date) <= datetime('now')
          )
          AND NOT EXISTS (
            SELECT 1
            FROM review_records rr
            WHERE rr.question_id = rp.question_id
              AND rr.review_date >= ?
              AND rr.review_date < ?
          )
        ORDER BY rp.next_review_date ASC, q.id ASC
        LIMIT 50
      `, [todayStartStr, todayEndStr])

      return { success: true, data: questions }
    } catch (error) {
      safeError('Get due questions failed:', error)
      return { success: false, error: String(error) }
    }
  })
}

/**
 * 更新复习进度（简化版调度规则）
 * 返回下次复习时间
 */
function updateReviewProgress(questionId: number, score: number, nowStr: string): string {
  const existing = queryOne('SELECT * FROM review_progress WHERE question_id = ?', [questionId])

  const now = new Date(nowStr)
  let nextDate: Date
  let interval: number

  // 根据 score 确定复习间隔
  switch (score) {
    case 1:
    case 2:
      interval = 1  // 明天
      break
    case 3:
      interval = 3  // 3 天后
      break
    case 4:
      interval = 7  // 7 天后
      break
    case 5:
      interval = 15  // 15 天后
      break
    default:
      interval = 1
  }

  nextDate = new Date(now)
  nextDate.setDate(nextDate.getDate() + interval)

  const nextDateStr = nextDate.toISOString()
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // 计算 mastery_score
  let masteryScore: number
  switch (score) {
    case 1: masteryScore = 20; break
    case 2: masteryScore = 40; break
    case 3: masteryScore = 60; break
    case 4: masteryScore = 80; break
    case 5: masteryScore = 100; break
    default: masteryScore = 0
  }

  if (!existing) {
    // 首次复习
    const wrongCount = score <= 2 ? 1 : 0
    runSql(`
      INSERT INTO review_progress (question_id, review_count, last_review_date, next_review_date, ease_factor, interval_days, wrong_count, mastery_score)
      VALUES (?, 1, ?, ?, 2.5, ?, ?, ?)
    `, [questionId, todayStr, nextDateStr, interval, wrongCount, masteryScore])
  } else {
    // 更新
    const wrongCount = (existing.wrong_count || 0) + (score <= 2 ? 1 : 0)
    const newMasteryScore = Math.max(existing.mastery_score || 0, masteryScore)

    runSql(`
      UPDATE review_progress
      SET review_count = review_count + 1,
          last_review_date = ?,
          next_review_date = ?,
          interval_days = ?,
          wrong_count = ?,
          mastery_score = ?
      WHERE question_id = ?
    `, [todayStr, nextDateStr, interval, wrongCount, newMasteryScore, questionId])
  }

  return nextDateStr
}
