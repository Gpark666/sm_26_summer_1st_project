// node:test에서도 바로 불러올 수 있게 확장자를 붙인다.
import { layouts, type Layout } from './layout.ts'

// 칸 번호(페이지를 이어 붙인 번호) → 카메라 ID. null은 빈자리다.
export type Slots = (string | null)[]
export type SavedLayouts = Partial<Record<Layout, Slots>>
// 위치 필터 중 다른 위치 카메라가 있는 칸. 칸 번호는 유지하고 비워 보이되 놓을 수 없다.
export const hidden = 'hidden'
export type Cell<T> = T | null | typeof hidden

type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const browserStorage: StorageAccess = () => window.localStorage
// 그리드(1+5, 2×2, 3×3)마다 칸 배치를 따로 저장한다. 한 그리드를 바꿔도 다른 그리드는 그대로다.
export const orderKey = 'accessguard:live-order:v2'

// 끝에 남은 빈자리는 저장하지 않는다.
export function trim<T>(slots: readonly (T | null)[]): (T | null)[] {
  let end = slots.length
  while (end > 0 && slots[end - 1] === null) end--
  return slots.slice(0, end)
}

// 저장한 칸 배치에 카메라를 놓는다. 목록에서 없어진 카메라의 칸은 빈자리로 남기고,
// 배치에 없는 카메라(새 카메라)는 API 순서대로 맨 뒤에 붙인다.
export function arrange<T extends { cameraId: string }>(rows: readonly T[], saved: Slots = []): (T | null)[] {
  const byId = new Map(rows.map(row => [row.cameraId, row]))
  const placed = new Set<string>()
  const slots = saved.map(id => {
    const row = id === null || placed.has(id) ? undefined : byId.get(id)
    if (!row) return null
    placed.add(row.cameraId)
    return row
  })
  return trim(slots.concat(rows.filter(row => !placed.has(row.cameraId))))
}

// from 칸의 카메라를 to 칸으로 옮긴다. to에 카메라가 있으면 맞바꾸고, 빈자리면 from이 빈자리가 된다.
export function moveSlot(slots: Slots, from: number, to: number): Slots {
  if (from === to || from < 0 || to < 0 || slots[from] == null) return trim(slots)
  const next = [...slots]
  while (next.length <= to) next.push(null)
  const moving = next[from]
  next[from] = next[to]
  next[to] = moving
  return trim(next)
}

// 위치 필터를 걸어도 칸 번호는 그대로 두고, 다른 위치 카메라 칸은 hidden으로 바꾼다.
export function hideOthers<T>(slots: readonly (T | null)[], visible: (item: T) => boolean): Cell<T>[] {
  return slots.map(item => item === null || visible(item) ? item : hidden)
}

// 보여 줄 칸 수. 필터 중에는 마지막으로 보이는 카메라가 있는 칸까지만 센다.
export function cellCount<T>(cells: readonly Cell<T>[]) {
  let end = cells.length
  while (end > 0 && (cells[end - 1] === null || cells[end - 1] === hidden)) end--
  return cells.some(cell => cell === hidden) ? end : cells.length
}

// page 페이지의 칸들. 마지막 페이지의 남는 칸은 빈자리(null)로 채운다.
export function pageCells<T>(cells: readonly Cell<T>[], layout: Layout, page: number): Cell<T>[] {
  const size = layouts[layout]
  return Array.from({ length: size }, (_, index) => cells[(page - 1) * size + index] ?? null)
}

// 키보드로 놓을 칸을 고른다. 1+5는 큰 칸(0) 오른쪽에 작은 칸(1~5)이 세로로 있다. 끝에서는 움직이지 않는다.
export function neighbor(index: number, key: string, layout: Layout) {
  const count = layouts[layout]
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

const isSlots = (value: unknown): value is Slots =>
  Array.isArray(value) && value.every(id => id === null || typeof id === 'string')

// 읽지 못하거나 형식이 다른 그리드는 기본 순서(저장 없음)로 본다.
export function readLayouts(storage: StorageAccess = browserStorage): SavedLayouts {
  try {
    const parsed: unknown = JSON.parse(storage().getItem(orderKey) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return {}
    const saved: SavedLayouts = {}
    for (const layout of Object.keys(layouts) as Layout[]) {
      const slots = (parsed as Record<string, unknown>)[layout]
      if (isSlots(slots)) saved[layout] = slots
    }
    return saved
  } catch {
    return {}
  }
}

// 한 그리드의 배치만 바꾼다. null이면 그 그리드를 기본 순서로 되돌린다.
// 저장하지 못하면 false를 돌려주고 화면의 배치는 그대로 쓴다.
export function saveLayout(layout: Layout, slots: Slots | null, storage: StorageAccess = browserStorage) {
  try {
    const saved = readLayouts(storage)
    if (slots) saved[layout] = slots
    else delete saved[layout]
    if (Object.keys(saved).length) storage().setItem(orderKey, JSON.stringify(saved))
    else storage().removeItem(orderKey)
    return true
  } catch {
    return false
  }
}
