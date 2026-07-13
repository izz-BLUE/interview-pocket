import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer } from 'vite'
import initSqlJs from 'sql.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const vite = await createServer({
  configFile: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true }
})
const { parseMarkdown } = await vite.ssrLoadModule('/src/main/markdown.ts')
const { calculateReviewSchedule } = await vite.ssrLoadModule('/src/main/review.ts')
const { addSourceDisplayNames, createSourceKey } = await vite.ssrLoadModule('/src/main/source.ts')
const { buildKeywordCandidateFilter } = await vite.ssrLoadModule('/src/main/search-query.ts')
const { executeTransaction } = await vite.ssrLoadModule('/src/main/transaction.ts')
const { migrateQuestionSourceKey } = await vite.ssrLoadModule('/src/main/source-migration.ts')
const { writeFileAtomically } = await vite.ssrLoadModule('/src/main/persistence.ts')
const { isPositiveInteger, isReviewScore, normalizeSourceFilter } =
  await vite.ssrLoadModule('/src/main/validation.ts')

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

test('不同目录的同名题库生成不同来源标识', () => {
  const first = createSourceKey('D:/questions/java.md')
  const second = createSourceKey('E:/backup/java.md')

  assert.notEqual(first, second)
  assert.equal(first, createSourceKey('D:/questions/java.md'))
  assert.equal(first.startsWith('path:'), true)
})

test('同名来源在界面上增加稳定后缀以便区分', () => {
  const sources = addSourceDisplayNames([
    { source_key: 'path:11111111', source_file: 'java.md', count: 10 },
    { source_key: 'path:22222222', source_file: 'java.md', count: 20 },
    { source_key: 'path:33333333', source_file: 'mysql.md', count: 5 }
  ])

  assert.equal(sources[0].display_name, 'java.md · 11111111')
  assert.equal(sources[1].display_name, 'java.md · 22222222')
  assert.equal(sources[2].display_name, 'mysql.md')
})

test('旧数据库可无损迁移 source_key 且迁移可重复执行', async () => {
  const SQL = await initSqlJs()
  const database = new SQL.Database()
  database.run(`
    CREATE TABLE questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_file TEXT
    )
  `)
  database.run('INSERT INTO questions (title, source_file) VALUES (?, ?)', ['事务是什么？', 'java.md'])

  migrateQuestionSourceKey(database)
  migrateQuestionSourceKey(database)

  const row = database.exec('SELECT title, source_file, source_key FROM questions')[0].values[0]
  const indexes = database.exec("SELECT name FROM sqlite_master WHERE type = 'index'")[0].values.flat()
  database.close()

  assert.deepEqual(row, ['事务是什么？', 'java.md', 'java.md'])
  assert.equal(indexes.includes('idx_questions_source_key_title'), true)
  assert.equal(indexes.includes('idx_questions_source_key'), true)
})

test('搜索候选条件下推并正确转义 LIKE 通配符', () => {
  const filter = buildKeywordCandidateFilter(['mysql', '100%'])

  assert.match(filter.clause, /q\.title/)
  assert.match(filter.clause, /q\.raw_markdown/)
  assert.equal(filter.params.length, 12)
  assert.equal(filter.params[0], '%mysql%')
  assert.equal(filter.params[6], '%100\\%%')
})

test('搜索候选 SQL 可由 SQLite 执行并将通配符作为普通字符', async () => {
  const SQL = await initSqlJs()
  const database = new SQL.Database()
  database.run(`
    CREATE TABLE questions (
      title TEXT,
      memory_point TEXT,
      standard_answer TEXT,
      short_answer TEXT,
      deep_answer TEXT,
      raw_markdown TEXT
    )
  `)
  database.run('INSERT INTO questions (title) VALUES (?)', ['掌握 100% MySQL'])
  database.run('INSERT INTO questions (title) VALUES (?)', ['掌握 1000 MySQL'])

  const filter = buildKeywordCandidateFilter(['100%'])
  const statement = database.prepare(`SELECT title FROM questions q WHERE ${filter.clause}`)
  statement.bind(filter.params)

  const titles = []
  while (statement.step()) {
    titles.push(statement.getAsObject().title)
  }
  statement.free()
  database.close()

  assert.deepEqual(titles, ['掌握 100% MySQL'])
})

test('事务失败时回滚且不执行提交后持久化', () => {
  const commands = []
  let persisted = false
  const database = { run: sql => commands.push(sql) }

  assert.throws(() => {
    executeTransaction(
      database,
      () => {
        commands.push('INSERT')
        throw new Error('expected failure')
      },
      () => { persisted = true }
    )
  }, /expected failure/)

  assert.deepEqual(commands, ['BEGIN IMMEDIATE TRANSACTION', 'INSERT', 'ROLLBACK'])
  assert.equal(persisted, false)
})

test('事务成功后提交并执行一次持久化', () => {
  const commands = []
  let persistCount = 0
  const database = { run: sql => commands.push(sql) }

  const result = executeTransaction(
    database,
    () => {
      commands.push('UPDATE')
      return 42
    },
    () => { persistCount++ }
  )

  assert.equal(result, 42)
  assert.deepEqual(commands, ['BEGIN IMMEDIATE TRANSACTION', 'UPDATE', 'COMMIT'])
  assert.equal(persistCount, 1)
})

test('数据库文件使用临时文件原子替换且不遗留临时文件', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-pocket-'))
  const target = path.join(directory, 'database.db')

  try {
    fs.writeFileSync(target, 'old')
    writeFileAtomically(target, Buffer.from('new'))

    assert.equal(fs.readFileSync(target, 'utf8'), 'new')
    assert.deepEqual(fs.readdirSync(directory), ['database.db'])
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('IPC 基础参数校验拒绝非法值', () => {
  assert.equal(isPositiveInteger(1), true)
  assert.equal(isPositiveInteger(0), false)
  assert.equal(isPositiveInteger(1.5), false)
  assert.equal(isReviewScore(5), true)
  assert.equal(isReviewScore(6), false)
  assert.equal(normalizeSourceFilter('ALL'), null)
  assert.equal(normalizeSourceFilter(' source-key '), 'source-key')
})
