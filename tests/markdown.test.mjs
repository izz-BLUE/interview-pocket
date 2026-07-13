import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer } from 'vite'

const vite = await createServer({
  configFile: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true }
})
const { parseMarkdown } = await vite.ssrLoadModule('/src/main/markdown.ts')
const { calculateReviewSchedule } = await vite.ssrLoadModule('/src/main/review.ts')

after(async () => {
  await vite.close()
})

test('解析 H3 标准答案及辅助字段', () => {
  const markdown = `# Java 后端

## Q1. 什么是事务？

### 推荐回答
事务是一组原子操作。

### 简短回答
要么全部成功，要么全部失败。

### 深入回答
事务具有 ACID 特性。

### 一句话锚点
ACID。

### 追问点
- MySQL 如何实现隔离性？
- Redis 事务有什么区别？

### 注意
- 不要把原子性和隔离性混淆。
`

  const [question] = parseMarkdown(markdown, 'java.md')

  assert.equal(question.title, '什么是事务？')
  assert.equal(question.category, 'Java 后端')
  assert.equal(question.standard_answer, '事务是一组原子操作。')
  assert.equal(question.short_answer, '要么全部成功，要么全部失败。')
  assert.equal(question.deep_answer, '事务具有 ACID 特性。')
  assert.equal(question.memory_point, 'ACID。')
  assert.deepEqual(question.follow_ups, ['MySQL 如何实现隔离性？', 'Redis 事务有什么区别？'])
  assert.deepEqual(question.warnings, ['不要把原子性和隔离性混淆。'])
})

test('无结构化答案时使用正文作为 fallback', () => {
  const markdown = `# 数据库

## Q2. 什么是索引？
索引是帮助数据库高效获取数据的数据结构。
`

  const [question] = parseMarkdown(markdown, 'mysql.md')

  assert.equal(question.standard_answer, '索引是帮助数据库高效获取数据的数据结构。')
})

test('排除说明性标题并保留代码块内容', () => {
  const markdown = `# 项目

## 如何使用这份手册
这不是题目。

## Q3. 如何写示例？
### 推荐回答
\`\`\`java
System.out.println("ok");
\`\`\`
`

  const questions = parseMarkdown(markdown, 'project.md')

  assert.equal(questions.length, 1)
  assert.match(questions[0].standard_answer || '', /System\.out\.println/)
})

test('低分会降低已有掌握度并增加错题次数', () => {
  const schedule = calculateReviewSchedule(
    { review_count: 3, mastery_score: 100, wrong_count: 1 },
    1,
    '2026-07-13T08:00:00.000Z'
  )

  assert.equal(schedule.masteryScore, 76)
  assert.equal(schedule.wrongCount, 2)
  assert.equal(schedule.interval, 1)
})
