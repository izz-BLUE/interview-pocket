interface MigrationStatement {
  step(): boolean
  getAsObject(): Record<string, unknown>
  free(): boolean
}

export interface MigrationDatabase {
  run(sql: string): unknown
  prepare(sql: string): MigrationStatement
}

export function migrateQuestionSourceKey(database: MigrationDatabase): void {
  const statement = database.prepare('PRAGMA table_info(questions)')
  const columnNames: string[] = []
  while (statement.step()) {
    const row = statement.getAsObject()
    if (typeof row.name === 'string') {
      columnNames.push(row.name)
    }
  }
  statement.free()

  if (!columnNames.includes('source_key')) {
    database.run('ALTER TABLE questions ADD COLUMN source_key TEXT')
  }

  database.run(`
    UPDATE questions
    SET source_key = source_file
    WHERE source_key IS NULL OR source_key = ''
  `)
  database.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_source_key_title
    ON questions(source_key, title)
  `)
  database.run('CREATE INDEX IF NOT EXISTS idx_questions_source_key ON questions(source_key)')
}
