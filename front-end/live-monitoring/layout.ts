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
