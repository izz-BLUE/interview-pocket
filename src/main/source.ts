import { createHash } from 'crypto'
import path from 'path'

export function normalizeSourcePath(filePath: string): string {
  const normalized = path.normalize(path.resolve(filePath))
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

export function createSourceKey(filePath: string): string {
  const digest = createHash('sha256')
    .update(normalizeSourcePath(filePath))
    .digest('hex')

  return `path:${digest}`
}

export interface QuestionSourceRow {
  source_key: string
  source_file: string
  count: number
}

export function addSourceDisplayNames(sources: QuestionSourceRow[]) {
  const fileNameCounts = new Map<string, number>()
  for (const source of sources) {
    fileNameCounts.set(source.source_file, (fileNameCounts.get(source.source_file) || 0) + 1)
  }

  return sources.map(source => ({
    ...source,
    display_name: (fileNameCounts.get(source.source_file) || 0) > 1
      ? `${source.source_file} · ${source.source_key.slice(-8)}`
      : source.source_file
  }))
}
