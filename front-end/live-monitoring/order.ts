// node:test에서도 바로 불러올 수 있게 확장자를 붙인다.
import { layouts, type Layout } from './layout.ts'

// 칸 번호(페이지를 이어 붙인 번호) → 카메라 ID. null은 빈자리다.
export type Slots = (string | null)[]
// 그리드(1+5, 2×2, 3×3) × 위치(''는 전체 위치)마다 칸 배치를 따로 저장한다.
// 한 그리드·위치에서 바꿔도 다른 조합은 그대로다.
export type SavedLayouts = Partial<Record<Layout, Record<string, Slots>>>

type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const browserStorage: StorageAccess = () => window.localStorage
export const orderKey = 'accessguard:live-order:v3'

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

// page 페이지의 칸들. 마지막 페이지의 남는 칸은 빈자리(null)로 채운다.
export function pageCells<T>(slots: readonly (T | null)[], layout: Layout, page: number): (T | null)[] {
  const size = layouts[layout]
  return Array.from({ length: size }, (_, index) => slots[(page - 1) * size + index] ?? null)
}

// 전체 칸 번호(0부터)가 몇 쪽 몇 번째 칸인지 (둘 다 1부터)
export function positionOf(index: number, layout: Layout) {
  const size = layouts[layout]
  return { page: Math.floor(index / size) + 1, cell: (index % size) + 1 }
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
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// 읽지 못하거나 형식이 다른 조합은 기본 순서(저장 없음)로 본다.
export function readLayouts(storage: StorageAccess = browserStorage): SavedLayouts {
  try {
    const parsed: unknown = JSON.parse(storage().getItem(orderKey) ?? '{}')
    if (!isRecord(parsed)) return {}
    const saved: SavedLayouts = {}
    for (const layout of Object.keys(layouts) as Layout[]) {
      const byLocation = parsed[layout]
      if (!isRecord(byLocation)) continue
      const valid = Object.entries(byLocation).filter((entry): entry is [string, Slots] => isSlots(entry[1]))
      if (valid.length) saved[layout] = Object.fromEntries(valid)
    }
    return saved
  } catch {
    return {}
  }
}

// 한 그리드·위치의 배치만 바꾼다. null이면 그 조합을 기본 순서로 되돌린다.
// 저장하지 못하면 false를 돌려주고 화면의 배치는 그대로 쓴다.
export function saveLayout(layout: Layout, location: string, slots: Slots | null, storage: StorageAccess = browserStorage) {
  try {
    const saved = readLayouts(storage)
    const byLocation = { ...saved[layout] }
    if (slots) byLocation[location] = slots
    else delete byLocation[location]
    if (Object.keys(byLocation).length) saved[layout] = byLocation
    else delete saved[layout]
    if (Object.keys(saved).length) storage().setItem(orderKey, JSON.stringify(saved))
    else storage().removeItem(orderKey)
    return true
  } catch {
    return false
  }
}
