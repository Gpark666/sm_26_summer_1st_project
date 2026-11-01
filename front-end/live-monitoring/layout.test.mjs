import test from 'node:test'
import assert from 'node:assert/strict'
import { parseLayout, pageCount, parsePage, pageItems, pageOf } from './layout.ts'

const rows = Array.from({ length: 18 }, (_, index) => index + 1)
test('레이아웃 쿼리를 읽고 잘못된 값은 2×2로 본다', () => {
  assert.equal(parseLayout('1+5'), '1+5')
  assert.equal(parseLayout('1 5'), '1+5')
  assert.equal(parseLayout('3x3'), '3x3')
  for (const value of [null, '', '4x4', '2×2', 'toString', '__proto__']) assert.equal(parseLayout(value), '2x2')
})
test('레이아웃별 페이지 수를 계산하고 빈 목록도 1페이지로 본다', () => {
  assert.equal(pageCount(18, '1+5'), 3)
  assert.equal(pageCount(18, '2x2'), 5)
  assert.equal(pageCount(18, '3x3'), 2)
  assert.equal(pageCount(4, '2x2'), 1)
  assert.equal(pageCount(0, '3x3'), 1)
})
test('페이지 쿼리는 1부터 전체 페이지 수까지의 정수만 허용한다', () => {
  assert.equal(parsePage('2', 3), 2)
  assert.equal(parsePage('3', 3), 3)
  for (const value of [null, '', '0', '4', '-1', '1.5', '2abc', ' 2', 'Infinity']) assert.equal(parsePage(value, 3), 1)
})
test('페이지에 해당하는 카메라만 잘라 내고 마지막 페이지는 남은 수만큼 반환한다', () => {
  assert.deepEqual(pageItems(rows, '1+5', 1), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(pageItems(rows, '1+5', 3), [13, 14, 15, 16, 17, 18])
  assert.deepEqual(pageItems(rows, '2x2', 5), [17, 18])
  assert.deepEqual(pageItems(rows, '3x3', 2), [10, 11, 12, 13, 14, 15, 16, 17, 18])
  assert.deepEqual(pageItems([], '2x2', 1), [])
})
test('W02에서 돌아갈 때 카메라가 들어 있는 페이지를 계산한다', () => {
  assert.equal(pageOf(0, '2x2'), 1)
  assert.equal(pageOf(3, '2x2'), 1)
  assert.equal(pageOf(4, '2x2'), 2)
  assert.equal(pageOf(17, '1+5'), 3)
  assert.equal(pageOf(9, '3x3'), 2)
  assert.equal(pageOf(-1, '3x3'), 1)
  for (const index of [0, 5, 6, 11, 12, 17]) {
    assert.ok(pageItems(rows, '1+5', pageOf(index, '1+5')).includes(rows[index]))
  }
})
