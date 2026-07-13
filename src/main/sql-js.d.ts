declare module 'sql.js' {
  export interface Statement {
    bind(values?: unknown[]): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): boolean
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer)
    run(sql: string, params?: unknown[]): Database
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  export interface SqlJsStatic {
    Database: typeof Database
  }

  export default function initSqlJs(): Promise<SqlJsStatic>
}
