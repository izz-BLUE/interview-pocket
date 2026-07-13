const SEARCHABLE_COLUMNS = [
  'q.title',
  'q.memory_point',
  'q.standard_answer',
  'q.short_answer',
  'q.deep_answer',
  'q.raw_markdown'
]

function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, match => `\\${match}`)
}

export function buildKeywordCandidateFilter(terms: string[]): { clause: string; params: string[] } {
  if (terms.length === 0) {
    return { clause: '1 = 0', params: [] }
  }

  const termClause = SEARCHABLE_COLUMNS
    .map(column => `LOWER(COALESCE(${column}, '')) LIKE ? ESCAPE '\\'`)
    .join(' OR ')
  const clause = `(${terms.map(() => `(${termClause})`).join(' OR ')})`
  const params = terms.flatMap(term => {
    const pattern = `%${escapeLikeTerm(term.toLowerCase())}%`
    return SEARCHABLE_COLUMNS.map(() => pattern)
  })

  return { clause, params }
}
