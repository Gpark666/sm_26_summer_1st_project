import test from 'node:test'
import assert from 'node:assert/strict'
import { backTarget, readFrom, readMoved, returnTo } from './returnPath.ts'

test('state.from은 pathname이 문자열일 때만 읽는다', () => {
  assert.deepEqual(readFrom({ from: { pathname: '/live', search: '?layout=2x2', hash: '', key: 'k' } }),
    { pathname: '/live', search: '?layout=2x2' })
  assert.deepEqual(readFrom({ from: { pathname: '/live' } }), { pathname: '/live', search: '' })
  for (const state of [null, undefined, {}, { from: null }, { from: { pathname: 3 } }, 'x']) assert.equal(readFrom(state), null)
})
test('moved는 true일 때만 넘긴 것으로 본다', () => {
  assert.equal(readMoved({ moved: true }), true)
  for (const state of [null, {}, { moved: 'true' }, { moved: 1 }]) assert.equal(readMoved(state), false)
})
test('복귀 주소는 이어받은 쿼리를 두고 배치·위치·페이지만 바꾼다', () => {
  const to = returnTo('?scenario=many&layout=1%2B5&location=본관+2층&page=2', '2x2', '', 3)
  assert.equal(to.pathname, '/live')
  const query = new URLSearchParams(to.search)
  assert.equal(query.get('scenario'), 'many')
  assert.equal(query.get('layout'), '2x2')
  assert.equal(query.get('location'), '')
  assert.equal(query.get('page'), '3')
  assert.equal(new URLSearchParams(returnTo('', '1+5', '지하 1층', 1).search).get('location'), '지하 1층')
})
test('W01에서 바로 들어와 넘기지 않았을 때만 기록을 되돌린다', () => {
  const from = { pathname: '/live', search: '?layout=2x2&page=2' }
  assert.equal(backTarget(from, false), -1)
  assert.equal(backTarget(from, true), from)
  assert.equal(backTarget(null, false), '/live')
  assert.equal(backTarget(null, true), '/live')
})
