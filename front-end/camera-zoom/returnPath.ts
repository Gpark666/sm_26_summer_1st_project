import type { Layout } from '../live-monitoring/layout'

export type From = { pathname: string, search: string }

// 이전 화면이 넘긴 state.from을 읽는다. 형식이 맞지 않으면 없는 것으로 본다.
export function readFrom(state: unknown): From | null {
  const from = (state as { from?: Partial<From> } | null)?.from
  return typeof from?.pathname === 'string'
    ? { pathname: from.pathname, search: typeof from.search === 'string' ? from.search : '' } : null
}

// W02 안에서 카메라를 넘기면 state에 moved가 붙는다.
export function readMoved(state: unknown) {
  return (state as { moved?: unknown } | null)?.moved === true
}

// W01로 돌아갈 주소. 이어받은 쿼리(scenario 등)는 두고 배치·위치·페이지만 바꾼다.
// '전체 위치'도 location=(빈 값)으로 남겨 설정의 기본 위치로 되돌아가지 않게 한다.
export function returnTo(search: string, layout: Layout, location: string, page: number): From {
  const query = new URLSearchParams(search)
  query.set('layout', layout)
  query.set('location', location)
  query.set('page', String(page))
  return { pathname: '/live', search: '?' + query }
}

// W01에서 바로 들어와 넘기지 않았으면 기록을 되돌리고(-1), 넘겼거나 직접 들어왔으면 복귀 주소로 바꿔치기한다.
export function backTarget(from: From | null, moved: boolean): -1 | From | '/live' {
  if (from && !moved) return -1
  return from ?? '/live'
}
