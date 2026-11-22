const recentKey = 'rozetka-recent'
const compareKey = 'rozetka-compare'

function read(key: string): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    if (!Array.isArray(parsed))
      return []
    return parsed.filter((item): item is number => Number.isInteger(item) && item > 0)
  } catch {
    return []
  }
}

function write(key: string, ids: number[]) {
  localStorage.setItem(key, JSON.stringify(ids))
}

export function recentIds() {
  return read(recentKey)
}

export function rememberProduct(id: number) {
  write(recentKey, [id, ...read(recentKey).filter((item) => item !== id)].slice(0, 8))
}

export function compareIds() {
  return read(compareKey)
}

export function toggleCompare(id: number) {
  const current = read(compareKey)
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id].slice(-4)
  write(compareKey, next)
  return next
}
