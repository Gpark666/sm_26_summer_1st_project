import test from 'node:test'
import assert from 'node:assert/strict'
import { defaults, layouts, liveViewOptions, preferenceKey, readPreferences, samePreferences,
  savePreferences, shouldHighlightCamera, validLocation } from './settings.ts'

function memory() {
  const map = new Map()
  return () => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) })
}
test('처음 진입하면 2×2·전체 위치·펼침·자동 포커스 켜짐을 사용한다', () => {
  assert.deepEqual(readPreferences('A', memory()).value, { layout: '2×2', location: '', sidebar: 'expanded', autoFocus: true })
})
test('각 분할 구성을 저장한 뒤 다시 읽을 수 있고 저장 범위가 분리된다', () => {
  const db = memory()
  for (const layout of layouts) {
    const p = { layout, location: '본관 1층', sidebar: 'collapsed', autoFocus: false }
    savePreferences('A', p, db)
    assert.deepEqual(readPreferences('A', db).value, p)
    assert.deepEqual(readPreferences('B', db).value, defaults)
  }
})
test('기본값으로 편집해도 저장 전에는 기존 값이 유지된다', () => {
  const db = memory(), old = { ...defaults, layout: '1+5' }
  savePreferences('A', old, db)
  const draft = { ...defaults }
  assert.equal(samePreferences(old, draft), false)
  assert.deepEqual(readPreferences('A', db).value, old)
  savePreferences('A', draft, db)
  assert.deepEqual(readPreferences('A', db).value, defaults)
})
test('잘못된 JSON이나 잘못된 상태값은 안내와 기본값으로 복구한다', () => {
  const db = memory()
  for (const invalid of ['{', JSON.stringify({ ...defaults, layout: '4×4' })]) {
    db().setItem(preferenceKey('A'), invalid)
    const result = readPreferences('A', db)
    assert.deepEqual(result.value, defaults)
    assert.ok(result.notice)
  }
})
test('브라우저 저장소 읽기·쓰기 실패를 구분한다', () => {
  const blocked = () => { throw new Error('storage blocked') }
  assert.ok(readPreferences('A', blocked).notice)
  assert.throws(() => savePreferences('A', defaults, blocked), /storage blocked/)
})
test('라이브 관제는 선택 위치의 카메라만 쓰고 접근할 수 없는 위치는 전체로 복구한다', () => {
  const cams = [{ location: '정문' }, { location: '서관' }]
  const pref = { ...defaults, layout: '1+5', location: '서관', sidebar: 'collapsed' }
  const result = liveViewOptions(pref, cams)
  assert.deepEqual(result.cameras, [cams[1]])
  assert.equal(result.layout, '1+5')
  assert.equal(result.sidebarCollapsed, true)
  assert.equal(validLocation('서관', []), '')
  assert.deepEqual(liveViewOptions(pref, cams.slice(0, 1)).cameras, [cams[0]])
})
test('포커스가 켜진 경우만 오프라인·영상 오류를 강조한다', () => {
  assert.equal(shouldHighlightCamera(defaults, 'online', false), false)
  assert.equal(shouldHighlightCamera(defaults, 'offline', false), true)
  assert.equal(shouldHighlightCamera(defaults, 'online', true), true)
  assert.equal(shouldHighlightCamera({ ...defaults, autoFocus: false }, 'offline', true), false)
})
