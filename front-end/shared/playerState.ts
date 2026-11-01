import type { Camera } from '../camera-list/cameraApi'

export type PlayerState =
  | { kind: 'connecting' }
  | { kind: 'playing', session: unknown }
  | { kind: 'failed', message: string }
  | { kind: 'offline' }

// start: 화면에 나타남·카메라 변경, retry: 재시도 버튼 (오프라인이어도 한 번 요청해 본다)
export type PlayerEvent =
  | { type: 'start', status: Camera['status'] }
  | { type: 'retry' }
  | { type: 'success', session: unknown }
  | { type: 'failure', message: string }

export function startState(status: Camera['status']): PlayerState {
  return status === 'offline' ? { kind: 'offline' } : { kind: 'connecting' }
}

export function nextState(state: PlayerState, event: PlayerEvent): PlayerState {
  switch (event.type) {
    case 'start': return startState(event.status)
    case 'retry': return { kind: 'connecting' }
    // 요청 중이 아닐 때 늦게 도착한 응답은 무시한다.
    case 'success': return state.kind === 'connecting' ? { kind: 'playing', session: event.session } : state
    case 'failure': return state.kind === 'connecting' ? { kind: 'failed', message: event.message } : state
  }
}

export function canRetry(state: PlayerState) {
  return state.kind === 'failed' || state.kind === 'offline'
}

export function failureMessage(error: unknown) {
  return error instanceof Error && !['TypeError', 'TimeoutError'].includes(error.name)
    ? error.message : '서버 연결을 확인한 뒤 다시 시도해 주세요.'
}
