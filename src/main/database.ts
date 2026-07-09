import initSqlJs, { Database } from 'sql.js'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database | null = null
let dbPath: string = ''

export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'interview-pocket.db')
}

export async function initDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()
  dbPath = getDatabasePath()

  // 如果数据库文件存在，读取它
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表
  createTables(db)

  // 保存数据库
  saveDatabase()

  return db
}

function createTables(db: Database): void {
  // 题目表
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      source_heading_path TEXT,
      standard_answer TEXT,
      short_answer TEXT,
      deep_answer TEXT,
      memory_point TEXT,
      follow_ups TEXT,
      warnings TEXT,
      raw_markdown TEXT,
      source_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 标签表
  db.run(`
    CREATE TABLE IF NOT EXISTS question_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(question_id, tag)
    )
  `)

  // 复习进度表
  db.run(`
    CREATE TABLE IF NOT EXISTS review_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL UNIQUE,
      review_count INTEGER DEFAULT 0,
      last_review_date TEXT,
      next_review_date TEXT,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 1,
      wrong_count INTEGER DEFAULT 0,
      mastery_score INTEGER DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `)

  // 复习记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      review_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `)

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_questions_title ON questions(title)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON question_tags(tag)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_review_progress_next_date ON review_progress(next_review_date)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_review_records_question ON review_records(question_id)`)
}

export function saveDatabase(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

// 辅助函数：执行查询并返回结果
export function queryAll(sql: string, params: any[] = []): any[] {
  const db = getDatabase()
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// 辅助函数：执行查询并返回单条结果
export function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : null
}

// 辅助函数：执行更新操作
export function runSql(sql: string, params: any[] = []): void {
  const db = getDatabase()
  db.run(sql, params)
  saveDatabase()
}
