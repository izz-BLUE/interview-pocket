/**
 * Safe logger - 避免 EPIPE 错误导致主进程崩溃
 */

// 处理 stdout/stderr 的 EPIPE 错误
if (process.stdout && typeof process.stdout.on === 'function') {
  process.stdout.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') return
  })
}

if (process.stderr && typeof process.stderr.on === 'function') {
  process.stderr.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') return
  })
}

// 处理未捕获的 EPIPE 异常
process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') return
  // 非 EPIPE 错误继续抛出
  throw err
})

/**
 * 安全的 console.log，忽略 EPIPE 错误
 */
export function safeLog(...args: any[]): void {
  try {
    console.log(...args)
  } catch (err: any) {
    if (err?.code === 'EPIPE') return
    // 其他错误静默忽略
  }
}

/**
 * 安全的 console.error，忽略 EPIPE 错误
 */
export function safeError(...args: any[]): void {
  try {
    console.error(...args)
  } catch (err: any) {
    if (err?.code === 'EPIPE') return
    // 其他错误静默忽略
  }
}

/**
 * 安全的 console.warn，忽略 EPIPE 错误
 */
export function safeWarn(...args: any[]): void {
  try {
    console.warn(...args)
  } catch (err: any) {
    if (err?.code === 'EPIPE') return
    // 其他错误静默忽略
  }
}
