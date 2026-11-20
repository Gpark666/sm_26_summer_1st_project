import test from 'node:test'
import assert from 'node:assert/strict'
import { initialDraft, validateDraft, createDemoCameraAddGateway, createUnavailableCameraAddGateway, withRegisteredDemoCameras, readDemoCameras, demoCameraKey } from './cameraAdd.ts'
const draft = { ...initialDraft, name: ' 정문 카메라 ', location: ' 본관 ', host: '192.168.0.20', path: '/stream1', username: 'admin', password: 'private-test-password' }
const payload = () => validateDraft(draft).payload
const signal = () => new AbortController().signal
function storage() {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) }
}
test('필수 항목·포트·USB 장치 번호를 검증하고 RTSP 입력을 정규화한다', () => {
  assert.deepEqual(validateDraft(draft).errors, {})
  assert.equal(payload().name, '정문 카메라')
  assert.equal(payload().connection.url, 'rtsp://192.168.0.20:554/stream1')
  for (const port of ['0','65536','1.5','abc','']) assert.ok(validateDraft({ ...draft, port }).errors.port)
  assert.ok(validateDraft({ ...draft, name:' ' }).errors.name)
  assert.ok(validateDraft({ ...draft, location:' ' }).errors.location)
  assert.ok(validateDraft({ ...draft, memo:'x'.repeat(501) }).errors.memo)
  assert.ok(validateDraft({ ...draft, kind:'usb', cameraIndex:'-1' }).errors.cameraIndex)
  assert.equal(validateDraft({ ...draft, kind:'usb', cameraIndex:'1', url:'bad' }).payload.connection.cameraIndex, 1)
})
test('전체 RTSP 주소와 분리 입력은 같은 연결 정보로 변환되며 인증정보 포함 URL은 거부한다', () => {
  assert.deepEqual(validateDraft({ ...draft, addressMode:'url', url:'rtsp://192.168.0.20:554/stream1' }).payload, payload())
  for (const url of ['https://example.com/a', 'file:///tmp/a', 'rtsp://user:secret@example.com/a', 'rtsp://example.com:0/a', 'rtsp://example.com/a#fragment']) {
    assert.ok(validateDraft({ ...draft, addressMode:'url', url }).errors.url)
  }
  assert.ok(validateDraft({ ...draft, host:'192.168.1.1/path' }).errors.host)
})
test('테스트 성공 전 저장, 입력 변경 후 저장, 해제된 테스트 저장을 거부한다', async () => {
  const gateway = createDemoCameraAddGateway(storage(), 0)
  await assert.rejects(gateway.save(payload(), { id:'unknown' }, signal()), /다시 연결 테스트/)
  const receipt = await gateway.test(payload(), 'success', signal())
  await assert.rejects(gateway.save({ ...payload(), name:'수정' }, receipt, signal()), /다시 연결 테스트/)
  await assert.rejects(gateway.save({ ...payload(), connection:{ ...payload().connection, password:'changed' } }, receipt, signal()), /다시 연결 테스트/)
  gateway.release(receipt)
  await assert.rejects(gateway.save(payload(), receipt, signal()), /다시 연결 테스트/)
})
test('만료된 테스트는 조작한 expiresAt으로도 저장할 수 없다', async t => {
  const gateway = createDemoCameraAddGateway(storage(), 0)
  const receipt = await gateway.test(payload(), 'success', signal())
  t.mock.method(Date, 'now', () => receipt.expiresAt + 1)
  await assert.rejects(gateway.save(payload(), { ...receipt, expiresAt:receipt.expiresAt+100000 }, signal()), /다시 연결 테스트/)
})
test('예시 저장은 목록 메타데이터만 보관하고 같은 요청을 재시도해도 중복 등록하지 않는다', async () => {
  const store = storage(), gateway = createDemoCameraAddGateway(store, 0)
  const receipt = await gateway.test(payload(), 'success', signal())
  const saved = await gateway.save(payload(), receipt, signal())
  assert.deepEqual(await gateway.save(payload(), receipt, signal()), saved)
  const stored = store.getItem(demoCameraKey)
  for (const secret of ['private-test-password', 'admin', 'rtsp://', 'analysisEnabled']) assert.ok(!stored.includes(secret))
  assert.equal(readDemoCameras(store).length, 1)
  const source = { demo:true, list:async()=>[], playback:async()=>null }
  assert.equal((await withRegisteredDemoCameras(source,store).list(signal(),0))[0].cameraId, saved.cameraId)
  const real = { ...source, demo:false }
  assert.equal(withRegisteredDemoCameras(real,store), real)
})
test('연결 실패·저장 실패 시 예시 목록에 남기지 않는다', async () => {
  const store = storage(), gateway = createDemoCameraAddGateway(store, 0)
  await assert.rejects(gateway.test(payload(), 'test-failure', signal()), /시연용 연결 실패/)
  const receipt = await gateway.test(payload(), 'save-failure', signal())
  await assert.rejects(gateway.save(payload(), receipt, signal()), /시연용 저장 실패/)
  assert.deepEqual(readDemoCameras(store), [])
})
test('취소된 테스트와 저장은 완료되거나 목록을 변경하지 않는다', async () => {
  const store = storage(), gateway = createDemoCameraAddGateway(store, 10)
  const testAbort = new AbortController()
  const testing = gateway.test(payload(), 'success', testAbort.signal)
  testAbort.abort()
  await assert.rejects(testing, { name:'AbortError' })
  const receipt = await gateway.test(payload(), 'success', signal())
  const saveAbort = new AbortController()
  const saving = gateway.save(payload(), receipt, saveAbort.signal)
  saveAbort.abort()
  await assert.rejects(saving, { name:'AbortError' })
  assert.deepEqual(readDemoCameras(store), [])
})
test('저장소 접근 실패·손상은 성공으로 숨기지 않는다', async () => {
  const store = storage()
  store.setItem(demoCameraKey, '{broken')
  assert.throws(() => readDemoCameras(store), /읽지 못했습니다/)
  store.setItem(demoCameraKey, '[]')
  const failing = { getItem:store.getItem, setItem:()=>{ throw new Error('quota') } }
  const gateway = createDemoCameraAddGateway(failing,0)
  const receipt = await gateway.test(payload(), 'success', signal())
  await assert.rejects(gateway.save(payload(),receipt,signal()), /저장하지 못했습니다/)
})
test('서버 모드는 미구현 API 호출이나 예시 저장을 수행하지 않는다', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', ()=>{ throw new Error('unexpected call') })
  const gateway = createUnavailableCameraAddGateway()
  assert.equal(gateway.demo, false)
  await assert.rejects(gateway.test(payload(),'success',signal()), /API가 아직 연결되지/)
  await assert.rejects(gateway.save(payload(), { id:'x' }, signal()), /API가 아직 연결되지/)
  assert.equal(fetch.mock.callCount(),0)
})
