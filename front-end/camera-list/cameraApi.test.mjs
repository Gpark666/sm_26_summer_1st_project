import test from 'node:test'
import assert from 'node:assert/strict'
import { demoSource, realSource, parseList, filterCameras } from './cameraApi.ts'

const signal = new AbortController().signal
const camera = { cameraId: 7, name: '정문 점자블록', location: '본관 1층', status: 'online', lastSeenAt: null }
test('목록·items 응답에서 카메라 ID를 보존하고 잘못된 응답은 오류 처리한다', () => {
  assert.equal(parseList([camera])[0].cameraId, '7')
  assert.equal(parseList({ items: [camera] })[0].name, camera.name)
  assert.deepEqual(parseList({ items: [] }), [])
  for (const data of [{}, [camera, camera], [{ ...camera, status: 'playing' }]]) {
    assert.throws(() => parseList(data))
  }
})
test('검색어, 위치, 장비 상태를 동시에 적용한다', async () => {
  const rows = await demoSource().list(signal, 0)
  assert.deepEqual(filterCameras(rows, '경사', '본관 1층', 'online').map(row => row.cameraId), ['cam-02'])
  assert.equal(filterCameras(rows, '경사', '', 'offline').length, 0)
})
test('예시 환경에서 빈 목록, 조회 실패, 재조회 복구를 확인한다', async () => {
  assert.deepEqual(await demoSource('empty').list(signal, 0), [])
  const source = demoSource('error')
  await assert.rejects(source.list(signal, 0))
  assert.equal((await source.list(signal, 1)).length, 4)
})
test('many 시나리오는 기본 4대를 포함한 18대를 겹치지 않는 ID로 반환한다', async () => {
  const rows = await demoSource('many').list(signal, 0)
  const base = await demoSource().list(signal, 0)
  assert.equal(rows.length, 18)
  assert.equal(new Set(rows.map(row => row.cameraId)).size, 18)
  assert.deepEqual(rows.slice(0, 4).map(row => row.cameraId), base.map(row => row.cameraId))
  assert.deepEqual(parseList(rows), rows)
  assert.ok(rows.slice(4).some(row => row.status === 'offline'))
})
test('오프라인 장비의 재연결 실패가 다른 장비 상태를 바꾸지 않는다', async () => {
  const source = demoSource()
  const rows = await source.list(signal, 0)
  await assert.rejects(source.playback(rows[2], signal))
  assert.equal(rows[2].status, 'offline')
  assert.equal((await source.playback(rows[0], signal)).cameraId, rows[0].cameraId)
})
test('서버 모드는 목록 GET 및 선택한 한 대의 세션 POST를 호출한다', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push([url, init.method])
    return Response.json(init.method === 'GET' ? { items: [camera] } : { sessionId: 's1' })
  })
  const source = realSource('/api/v1/')
  const [row] = await source.list(signal, 0)
  assert.deepEqual(await source.playback(row, signal), { sessionId: 's1' })
  assert.deepEqual(calls, [['/api/v1/cameras', 'GET'], ['/api/v1/cameras/7/playback-session', 'POST']])
})
test('권한 오류나 HTML 응답을 빈 목록으로 표시하지 않는다', async t => {
  const source = realSource()
  const request = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 403 }))
  await assert.rejects(source.list(signal, 0), /권한/)
  request.mock.mockImplementation(async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }))
  await assert.rejects(source.list(signal, 0), /JSON/)
})
