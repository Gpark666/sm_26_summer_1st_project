export const layouts = ['1×1', '2×2', '3×3', '1+5'] as const
export type Layout = typeof layouts[number]
export type Preferences = {
  layout: Layout
  location: string
  sidebar: 'expanded' | 'collapsed'
  autoFocus: boolean
}
export const defaults: Readonly<Preferences> = Object.freeze({
  layout: '2×2', location: '', sidebar: 'expanded', autoFocus: true,
})
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'>
const browserStorage: StorageAccess = () => window.localStorage
export const preferenceKey = (scope: string) =>
  'accessguard:monitoring:v1:' + encodeURIComponent(scope)

function isPreferences(input: unknown): input is Preferences {
  if (typeof input !== 'object' || input === null) return false
  const p = input as Partial<Preferences>
  return layouts.some(layout => layout === p.layout) && typeof p.location === 'string'
    && (p.sidebar === 'expanded' || p.sidebar === 'collapsed') && typeof p.autoFocus === 'boolean'
}

export function readPreferences(scope: string, storage: StorageAccess = browserStorage) {
  try {
    const raw = storage().getItem(preferenceKey(scope))
    if (raw === null) return { value: { ...defaults }, notice: '' }
    const parsed: unknown = JSON.parse(raw)
    if (isPreferences(parsed)) return { value: parsed, notice: '' }
    throw new Error('invalid preferences')
  } catch {
    return { value: { ...defaults }, notice: '저장값을 읽을 수 없어 기본값으로 열었습니다.' }
  }
}

// 쓰기에 실패하면 호출자에게 오류를 전달한다. 화면의 편집값은 그대로 유지한다.
export function savePreferences(scope: string, value: Preferences, storage: StorageAccess = browserStorage) {
  storage().setItem(preferenceKey(scope), JSON.stringify(value))
}

export function samePreferences(a: Preferences, b: Preferences) {
  return a.layout === b.layout && a.location === b.location &&
    a.sidebar === b.sidebar && a.autoFocus === b.autoFocus
}

// 목록 조회가 성공한 후 호출한다. 접근 가능한 위치가 사라지면 전체 위치를 사용한다.
export function validLocation(location: string, available: readonly string[]) {
  return available.includes(location) ? location : ''
}

// W01에서 접근 권한이 확인된 카메라 목록에 적용한다. 영상 연결 오류와 장비 상태는 별도 입력이다.
export function liveViewOptions<T extends { location: string }>(value: Preferences, cameras: readonly T[]) {
  const location = validLocation(value.location, cameras.map(c => c.location))
  return {
    layout: value.layout,
    location,
    cameras: cameras.filter(c => !location || c.location === location),
    sidebarCollapsed: value.sidebar === 'collapsed',
  }
}
export function shouldHighlightCamera(value: Preferences, status: 'online' | 'offline', playbackError: boolean) {
  return value.autoFocus && (status === 'offline' || playbackError)
}
