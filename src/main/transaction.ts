export interface TransactionDatabase {
  run(sql: string): unknown
}

export function executeTransaction<T>(
  database: TransactionDatabase,
  operation: () => T,
  afterCommit: () => void
): T {
  database.run('BEGIN IMMEDIATE TRANSACTION')
  let committed = false

  try {
    const result = operation()
    database.run('COMMIT')
    committed = true
    afterCommit()
    return result
  } catch (error) {
    if (!committed) {
      try {
        database.run('ROLLBACK')
      } catch {
        // 保留业务操作的原始异常
      }
    }
    throw error
  }
}
