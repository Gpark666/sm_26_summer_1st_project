import type { Layout } from './layout'

type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const browserStorage: StorageAccess = () => window.localStorage
export const orderKey = 'accessguard:live-order:v1'

// 저장한 순서의 카메라를 앞에 두고, 저장 순서에 없는 카메라(새 카메라)는 API 순서대로 뒤에 붙인다.
export function applyOrder<T extends { cameraId: string }>(rows: readonly T[], saved: readonly string[]): T[] {
  const rank = new Map<string, number>()
  saved.forEach((id, index) => { if (!rank.has(id)) rank.set(id, index) })
  const position = (row: T, index: number) => rank.get(row.cameraId) ?? saved.length + index
  return rows.map((row, index) => ({ row, at: position(row, index) }))
    .sort((a, b) => a.at - b.at).map(item => item.row)
}

// 전체 순서에서 두 카메라의 자리를 맞바꾼다. 위치 필터를 걸어도 결과가 같다.
export function swapOrder(order: readonly string[], a: string, b: string): string[] {
  const next = [...order]
  const i = next.indexOf(a), j = next.indexOf(b)
  if (i < 0 || j < 0 || i === j) return next
  next[i] = b
  next[j] = a
  return next
}

// 키보드로 놓을 칸을 고른다. 1+5는 큰 타일(0) 오른쪽에 작은 타일(1~5)이 세로로 있다. 끝에서는 움직이지 않는다.
export function neighbor(index: number, key: string, layout: Layout, count: number) {
  let next = index
  if (layout === '1+5') {
    if (key === 'ArrowRight' && index === 0) next = 1
    else if (key === 'ArrowLeft' && index > 0) next = 0
    else if (key === 'ArrowUp' && index > 1) next = index - 1
    else if (key === 'ArrowDown' && index > 0) next = index + 1
  } else {
    const columns = layout === '3x3' ? 3 : 2
    if (key === 'ArrowLeft' && index % columns > 0) next = index - 1
    else if (key === 'ArrowRight' && index % columns < columns - 1) next = index + 1
    else if (key === 'ArrowUp') next = index - columns
    else if (key === 'ArrowDown') next = index + columns
  }
  return next >= 0 && next < count ? next : index
}

// 읽지 못하거나 형식이 다르면 기본 순서(빈 목록)를 쓴다.
export function readOrder(storage: StorageAccess = browserStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage().getItem(orderKey) ?? '[]')
    return Array.isArray(parsed) && parsed.every(id => typeof id === 'string') ? parsed : []
  } catch {
    return []
  }
}

// null이면 저장한 순서를 지운다. 저장하지 못하면 false를 돌려주고 화면의 순서는 그대로 쓴다.
export function saveOrder(order: readonly string[] | null, storage: StorageAccess = browserStorage) {
  try {
    if (order) storage().setItem(orderKey, JSON.stringify(order))
    else storage().removeItem(orderKey)
    return true
  } catch {
    return false
  }
}
