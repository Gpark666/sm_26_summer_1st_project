import test from 'node:test'
import assert from 'node:assert/strict'
import { startState, nextState, canRetry, failureMessage } from './playerState.ts'

test('온라인 카메라는 연결 중, 오프라인 카메라는 요청 없이 오프라인으로 시작한다', () => {
  assert.deepEqual(startState('online'), { kind: 'connecting' })
  assert.deepEqual(startState('offline'), { kind: 'offline' })
  assert.deepEqual(nextState({ kind: 'playing', session: {} }, { type: 'start', status: 'offline' }), { kind: 'offline' })
})
test('연결 중에 받은 성공·실패만 반영한다', () => {
  const connecting = startState('online')
  assert.deepEqual(nextState(connecting, { type: 'success', session: { sessionId: 's1' } }),
    { kind: 'playing', session: { sessionId: 's1' } })
  assert.deepEqual(nextState(connecting, { type: 'failure', message: '실패' }), { kind: 'failed', message: '실패' })
  const offline = startState('offline')
  assert.equal(nextState(offline, { type: 'success', session: {} }), offline)
  const failed = { kind: 'failed', message: '실패' }
  assert.equal(nextState(failed, { type: 'success', session: {} }), failed)
})
test('재시도는 실패·오프라인에서만 보이고 다시 연결 중으로 바꾼다', () => {
  assert.equal(canRetry({ kind: 'failed', message: '' }), true)
  assert.equal(canRetry({ kind: 'offline' }), true)
  assert.equal(canRetry({ kind: 'connecting' }), false)
  assert.equal(canRetry({ kind: 'playing', session: null }), false)
  assert.deepEqual(nextState({ kind: 'offline' }, { type: 'retry' }), { kind: 'connecting' })
  assert.deepEqual(nextState({ kind: 'failed', message: '' }, { type: 'retry' }), { kind: 'connecting' })
})
test('네트워크·시간 초과 오류는 일반 안내 문구로 바꾼다', () => {
  assert.equal(failureMessage(new Error('카메라가 오프라인입니다.')), '카메라가 오프라인입니다.')
  assert.equal(failureMessage(new TypeError('Failed to fetch')), '서버 연결을 확인한 뒤 다시 시도해 주세요.')
  assert.equal(failureMessage(new DOMException('timeout', 'TimeoutError')), '서버 연결을 확인한 뒤 다시 시도해 주세요.')
  assert.equal(failureMessage('x'), '서버 연결을 확인한 뒤 다시 시도해 주세요.')
})
