import test from 'node:test'
import assert from 'node:assert/strict'
import { applyOrder, neighbor, orderKey, readOrder, saveOrder, swapOrder } from './order.ts'

const cam = id => ({ cameraId: id })
const ids = rows => rows.map(row => row.cameraId)
function memory() {
  const map = new Map()
  return () => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) })
}

test('저장 순서를 적용하고 새 카메라는 API 순서대로 뒤에 붙이며 없어진 ID는 무시한다', () => {
  const rows = ['a', 'b', 'c', 'd'].map(cam)
  assert.deepEqual(ids(applyOrder(rows, [])), ['a', 'b', 'c', 'd'])
  assert.deepEqual(ids(applyOrder(rows, ['c', 'a'])), ['c', 'a', 'b', 'd'])
  assert.deepEqual(ids(applyOrder(rows, ['x', 'd', 'c', 'b', 'a'])), ['d', 'c', 'b', 'a'])
  assert.deepEqual(ids(applyOrder(rows, ['b', 'b', 'a'])), ['b', 'a', 'c', 'd'])
})
test('두 카메라의 자리만 맞바꾸고 없는 ID나 같은 ID는 그대로 둔다', () => {
  const order = ['a', 'b', 'c', 'd']
  assert.deepEqual(swapOrder(order, 'a', 'c'), ['c', 'b', 'a', 'd'])
  assert.deepEqual(swapOrder(order, 'a', 'x'), order)
  assert.deepEqual(swapOrder(order, 'b', 'b'), order)
  assert.deepEqual(order, ['a', 'b', 'c', 'd'])
})
test('위치 필터를 건 상태에서 바꿔도 전체 순서에서 두 카메라만 맞바뀐다', () => {
  const rows = [{ cameraId: 'a', location: 'A' }, { cameraId: 'b', location: 'B' }, { cameraId: 'c', location: 'A' }]
  const next = swapOrder(ids(applyOrder(rows, [])), 'a', 'c')
  assert.deepEqual(ids(applyOrder(rows, next)), ['c', 'b', 'a'])
})
test('2×2·3×3은 행과 열을 따라, 끝에서는 그대로 칸을 고른다', () => {
  assert.equal(neighbor(0, 'ArrowRight', '2x2', 4), 1)
  assert.equal(neighbor(1, 'ArrowRight', '2x2', 4), 1)
  assert.equal(neighbor(0, 'ArrowDown', '2x2', 4), 2)
  assert.equal(neighbor(2, 'ArrowUp', '2x2', 4), 0)
  assert.equal(neighbor(0, 'ArrowUp', '2x2', 4), 0)
  assert.equal(neighbor(1, 'ArrowDown', '2x2', 3), 1)
  assert.equal(neighbor(4, 'ArrowLeft', '3x3', 9), 3)
  assert.equal(neighbor(3, 'ArrowLeft', '3x3', 9), 3)
  assert.equal(neighbor(4, 'ArrowDown', '3x3', 9), 7)
  assert.equal(neighbor(2, 'ArrowRight', '3x3', 9), 2)
  assert.equal(neighbor(0, 'Enter', '3x3', 9), 0)
})
test('1+5는 큰 타일과 작은 타일 사이를 좌우로, 작은 타일끼리는 위아래로 고른다', () => {
  assert.equal(neighbor(0, 'ArrowRight', '1+5', 6), 1)
  assert.equal(neighbor(3, 'ArrowLeft', '1+5', 6), 0)
  assert.equal(neighbor(1, 'ArrowDown', '1+5', 6), 2)
  assert.equal(neighbor(2, 'ArrowUp', '1+5', 6), 1)
  assert.equal(neighbor(1, 'ArrowUp', '1+5', 6), 1)
  assert.equal(neighbor(5, 'ArrowDown', '1+5', 6), 5)
  assert.equal(neighbor(0, 'ArrowDown', '1+5', 6), 0)
  assert.equal(neighbor(3, 'ArrowRight', '1+5', 6), 3)
  assert.equal(neighbor(0, 'ArrowRight', '1+5', 1), 0)
  assert.equal(neighbor(2, 'ArrowDown', '1+5', 3), 2)
})
test('순서를 저장·읽기·지우고 잘못된 값이나 저장소 오류는 기본 순서로 본다', () => {
  const db = memory()
  assert.deepEqual(readOrder(db), [])
  assert.equal(saveOrder(['b', 'a'], db), true)
  assert.deepEqual(readOrder(db), ['b', 'a'])
  assert.equal(saveOrder(null, db), true)
  assert.deepEqual(readOrder(db), [])
  for (const raw of ['{', '{"a":1}', '[1,2]', 'null']) {
    db().setItem(orderKey, raw)
    assert.deepEqual(readOrder(db), [])
  }
  const blocked = () => { throw new Error('storage blocked') }
  assert.deepEqual(readOrder(blocked), [])
  assert.equal(saveOrder(['a'], blocked), false)
})
