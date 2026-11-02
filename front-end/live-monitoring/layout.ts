// 쿼리 값 → 한 페이지 타일 수. 1+5는 큰 타일 1개 + 작은 타일 5개.
export const layouts = { '1+5': 6, '2x2': 4, '3x3': 9 }
export type Layout = keyof typeof layouts
export const layoutLabels: Record<Layout, string> = { '1+5': '1+5', '2x2': '2×2', '3x3': '3×3' }
export const layoutOptions = (Object.keys(layouts) as Layout[]).map((key): [string, string] => [key, layoutLabels[key]])

export function parseLayout(value: string | null): Layout {
  // 주소창에 직접 입력한 ?layout=1+5는 '+'가 공백으로 풀린다.
  const key = value?.replace(' ', '+')
  return key && Object.hasOwn(layouts, key) ? key as Layout : '2x2'
}

// 관제 설정(W04)의 배치 표기(2×2)를 W01 쿼리 값(2x2)으로 바꾼다.
// 1×1은 W02 배치라서, W01을 1×1로 열면 복귀할 때 W02가 반복되므로 2×2로 연다.
export function preferredLayout(value: string): Layout {
  return value === '1×1' ? '2x2' : parseLayout(value.replace('×', 'x'))
}

// 주소의 layout·location이 항상 우선이고, 없을 때만 관제 설정값을 쓴다.
// location=(빈 값)은 사용자가 '전체 위치'를 고른 것이다.
export function startView(query: URLSearchParams, preferred?: { layout: string, location: string }) {
  const layout = query.get('layout')
  return {
    layout: layout !== null ? parseLayout(layout) : preferred ? preferredLayout(preferred.layout) : parseLayout(null),
    location: query.get('location') ?? preferred?.location ?? '',
  }
}

export function pageCount(total: number, layout: Layout) {
  return Math.max(1, Math.ceil(total / layouts[layout]))
}

// 정수가 아니거나 범위를 벗어나면 1페이지로 본다.
export function parsePage(value: string | null, pages: number) {
  const page = Number(value)
  return /^\d+$/.test(value ?? '') && page >= 1 && page <= pages ? page : 1
}

export function pageItems<T>(rows: T[], layout: Layout, page: number) {
  const size = layouts[layout]
  return rows.slice((page - 1) * size, page * size)
}

// 목록에서 index번째(0부터) 카메라가 들어 있는 페이지
export function pageOf(index: number, layout: Layout) {
  return Math.floor(Math.max(0, index) / layouts[layout]) + 1
}
