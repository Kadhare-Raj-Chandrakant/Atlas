export function stripHtml(html: string): string {
  if (typeof document === 'undefined') return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

export function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
}

export function normalizeSentence(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'we', 'us', 'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his',
  'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'just', 'about',
  'up', 'out', 'down', 'off', 'over', 'under', 'again', 'further',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'too', 'very', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'am', 'im', 'ill',
  'ive', 'id', 'lets',
])

export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase())
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function getSentences(text: string): string[] {
  return text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
