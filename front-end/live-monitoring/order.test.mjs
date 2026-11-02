import test from 'node:test'
import assert from 'node:assert/strict'
import { arrange, moveSlot, neighbor, orderKey, pageCells, readLayouts, saveLayout, trim } from './order.ts'

const cam = (id, location = 'A') => ({ cameraId: id, location })
const ids = slots => slots.map(slot => slot?.cameraId ?? slot)
function memory() {
  const map = new Map()
  return () => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) })
}

test('저장 배치가 없으면 API 순서, 있으면 칸 번호대로 놓고 새 카메라는 맨 뒤에 붙인다', () => {
  const rows = ['a', 'b', 'c', 'd'].map(id => cam(id))
  assert.deepEqual(ids(arrange(rows)), ['a', 'b', 'c', 'd'])
  assert.deepEqual(ids(arrange(rows, ['c', null, 'a'])), ['c', null, 'a', 'b', 'd'])
  assert.deepEqual(ids(arrange(rows, ['b', 'b', 'a'])), ['b', null, 'a', 'c', 'd'])
})
test('목록에서 없어진 카메라의 칸은 빈자리로 남고 끝의 빈자리는 잘라 낸다', () => {
  const rows = ['a', 'c'].map(id => cam(id))
  assert.deepEqual(ids(arrange(rows, ['a', 'x', 'c'])), ['a', null, 'c'])
  assert.deepEqual(ids(arrange(rows, ['c', 'a', 'x', null])), ['c', 'a'])
  assert.deepEqual(trim(['a', null, null]), ['a'])
  assert.deepEqual(trim([null, null]), [])
})
test('카메라 칸으로 옮기면 맞바꾸고, 빈 칸으로 옮기면 원래 칸이 빈자리가 된다', () => {
  assert.deepEqual(moveSlot(['a', 'b', 'c'], 0, 2), ['c', 'b', 'a'])
  assert.deepEqual(moveSlot(['a', null, 'c'], 0, 1), [null, 'a', 'c'])
  assert.deepEqual(moveSlot(['a', 'b'], 0, 3), [null, 'b', null, 'a'])
  assert.deepEqual(moveSlot(['a', 'b', 'c'], 2, 5), ['a', 'b', null, null, null, 'c'])
  assert.deepEqual(moveSlot(['a', 'b', 'c'], 2, 3), ['a', 'b', null, 'c'])
  // 마지막 카메라를 앞 빈자리로 옮기면 끝의 빈자리는 잘린다
  assert.deepEqual(moveSlot(['a', null, 'c'], 2, 1), ['a', 'c'])
  assert.deepEqual(moveSlot(['a', null], 1, 0), ['a'])
  assert.deepEqual(moveSlot(['a', 'b'], 1, 1), ['a', 'b'])
})
test('위치 필터를 걸면 그 위치 카메라만 그 위치 배치대로 놓는다', () => {
  const rows = [cam('a', 'A'), cam('b', 'B'), cam('c', 'A'), cam('d', 'B')]
  const inA = rows.filter(row => row.location === 'A')
  assert.deepEqual(ids(arrange(inA)), ['a', 'c'])
  assert.deepEqual(ids(arrange(inA, ['c', null, 'a'])), ['c', null, 'a'])
  // 다른 위치 카메라 ID가 저장돼 있어도 그 위치 목록에 없으면 빈자리다
  assert.deepEqual(ids(arrange(inA, ['b', 'a'])), [null, 'a', 'c'])
})
test('페이지 칸은 레이아웃 크기만큼이고 남는 칸은 빈자리다', () => {
  const cells = ['a', null, 'b', 'c', 'd', 'e']
  assert.deepEqual(pageCells(cells, '2x2', 1), ['a', null, 'b', 'c'])
  assert.deepEqual(pageCells(cells, '2x2', 2), ['d', 'e', null, null])
  assert.deepEqual(pageCells(cells, '1+5', 1), cells)
  assert.equal(pageCells(cells, '3x3', 1).length, 9)
})
test('2×2·3×3은 행과 열을 따라, 끝에서는 그대로 칸을 고른다', () => {
  assert.equal(neighbor(0, 'ArrowRight', '2x2'), 1)
  assert.equal(neighbor(1, 'ArrowRight', '2x2'), 1)
  assert.equal(neighbor(0, 'ArrowDown', '2x2'), 2)
  assert.equal(neighbor(2, 'ArrowUp', '2x2'), 0)
  assert.equal(neighbor(3, 'ArrowDown', '2x2'), 3)
  assert.equal(neighbor(4, 'ArrowLeft', '3x3'), 3)
  assert.equal(neighbor(3, 'ArrowLeft', '3x3'), 3)
  assert.equal(neighbor(4, 'ArrowDown', '3x3'), 7)
  assert.equal(neighbor(8, 'ArrowDown', '3x3'), 8)
  assert.equal(neighbor(0, 'Enter', '3x3'), 0)
})
test('1+5는 큰 칸과 작은 칸 사이를 좌우로, 작은 칸끼리는 위아래로 고른다', () => {
  assert.equal(neighbor(0, 'ArrowRight', '1+5'), 1)
  assert.equal(neighbor(3, 'ArrowLeft', '1+5'), 0)
  assert.equal(neighbor(1, 'ArrowDown', '1+5'), 2)
  assert.equal(neighbor(2, 'ArrowUp', '1+5'), 1)
  assert.equal(neighbor(1, 'ArrowUp', '1+5'), 1)
  assert.equal(neighbor(5, 'ArrowDown', '1+5'), 5)
  assert.equal(neighbor(0, 'ArrowDown', '1+5'), 0)
  assert.equal(neighbor(3, 'ArrowRight', '1+5'), 3)
})
test('그리드·위치 조합별로 배치를 저장해 한 조합을 바꿔도 다른 조합은 그대로다', () => {
  const db = memory()
  assert.deepEqual(readLayouts(db), {})
  assert.equal(saveLayout('2x2', '', ['b', null, 'a'], db), true)
  assert.equal(saveLayout('2x2', '본관 1층', ['a'], db), true)
  assert.equal(saveLayout('3x3', '', ['c'], db), true)
  assert.deepEqual(readLayouts(db), { '2x2': { '': ['b', null, 'a'], '본관 1층': ['a'] }, '3x3': { '': ['c'] } })
  assert.equal(saveLayout('2x2', '', null, db), true)
  assert.deepEqual(readLayouts(db), { '2x2': { '본관 1층': ['a'] }, '3x3': { '': ['c'] } })
  assert.equal(saveLayout('2x2', '본관 1층', null, db), true)
  assert.equal(saveLayout('3x3', '', null, db), true)
  assert.equal(db().getItem(orderKey), null)
})
test('잘못된 저장값이나 저장소 오류는 기본 순서로 본다', () => {
  const db = memory()
  for (const raw of ['{', 'null', '[]', '{"2x2":["a"]}', '{"2x2":{"":[1]}}', '{"4x4":{"":["a"]}}']) {
    db().setItem(orderKey, raw)
    assert.deepEqual(readLayouts(db), {})
  }
  db().setItem(orderKey, '{"2x2":{"":["a",null],"B":"x"},"3x3":"x"}')
  assert.deepEqual(readLayouts(db), { '2x2': { '': ['a', null] } })
  const blocked = () => { throw new Error('storage blocked') }
  assert.deepEqual(readLayouts(blocked), {})
  assert.equal(saveLayout('2x2', '', ['a'], blocked), false)
})
