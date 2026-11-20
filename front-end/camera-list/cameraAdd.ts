import { parseList, type Camera, type CameraSource } from './cameraApi.ts'

export type CameraDraft = {
  name: string; location: string; memo: string
  kind: 'rtsp' | 'usb'; addressMode: 'parts' | 'url'
  host: string; port: string; path: string; url: string
  username: string; password: string; transport: 'tcp' | 'udp'
  cameraIndex: string; analysis: boolean
}
export type DraftErrors = Partial<Record<keyof CameraDraft, string>>
export type CameraRegistration = {
  name: string; location: string; memo: string; analysisEnabled: boolean
  connection: { type: 'local'; cameraIndex: number } |
    { type: 'network'; url: string; username: string; password: string; transport: 'tcp' | 'udp' }
}
export const initialDraft: CameraDraft = {
  name: '', location: '', memo: '', kind: 'rtsp', addressMode: 'parts',
  host: '', port: '554', path: '', url: '', username: '', password: '',
  transport: 'tcp', cameraIndex: '0', analysis: false,
}
export function validateDraft(draft: CameraDraft): { errors: DraftErrors; payload?: CameraRegistration } {
  const errors: DraftErrors = {}
  if (!draft.name.trim() || draft.name.trim().length > 100) errors.name = '카메라명을 1~100자로 입력해 주세요.'
  if (!draft.location.trim() || draft.location.trim().length > 100) errors.location = '설치 위치를 1~100자로 입력해 주세요.'
  if (draft.memo.length > 500) errors.memo = '메모는 500자 이내로 입력해 주세요.'
  let connection: CameraRegistration['connection'] | undefined
  if (draft.kind === 'usb') {
    if (!/^\d+$/.test(draft.cameraIndex) || !Number.isSafeInteger(Number(draft.cameraIndex))) {
      errors.cameraIndex = '0 이상의 장치 번호를 입력해 주세요.'
    } else connection = { type: 'local', cameraIndex: Number(draft.cameraIndex) }
  } else {
    let address = draft.url.trim()
    if (draft.addressMode === 'parts') {
      const host = draft.host.trim()
      if (!host || /[\s/@?#\\]/.test(host)) errors.host = 'IP 주소 또는 호스트명만 입력해 주세요.'
      if (!/^\d+$/.test(draft.port) || Number(draft.port) < 1 || Number(draft.port) > 65535) {
        errors.port = '포트는 1~65535 사이의 정수여야 합니다.'
      }
      if (/[\s#\\]/.test(draft.path)) errors.path = '공백·#·역슬래시 없이 경로를 입력해 주세요.'
      address = `rtsp://${host}:${draft.port}/${draft.path.replace(/^\/+/, '')}`
    }
    try {
      if (!address || /[\s\\]/.test(address)) throw new Error()
      const parsed = new URL(address)
      if (!['rtsp:', 'rtsps:'].includes(parsed.protocol) || !parsed.hostname || parsed.hash || parsed.port === '0') throw new Error()
      if (parsed.username || parsed.password) {
        errors[draft.addressMode === 'url' ? 'url' : 'host'] = '주소에서 계정 정보를 빼고 아래 장비 인증란에 입력해 주세요.'
      }
      connection = { type: 'network', url: parsed.href, username: draft.username, password: draft.password, transport: draft.transport }
    } catch {
      const field = draft.addressMode === 'url' ? 'url' : 'host'
      errors[field] ||= '올바른 RTSP 주소를 입력해 주세요. 예: rtsp://192.168.0.20:554/stream1'
    }
  }
  if (Object.keys(errors).length || !connection) return { errors }
  return { errors, payload: { name: draft.name.trim(), location: draft.location.trim(), memo: draft.memo.trim(), analysisEnabled: draft.analysis, connection } }
}

export type DemoScenario = 'success' | 'test-failure' | 'save-failure'
export type TestReceipt = { id: string; expiresAt: number; demo: boolean }
export type CameraAddGateway = {
  demo: boolean
  test: (payload: CameraRegistration, scenario: DemoScenario, signal: AbortSignal) => Promise<TestReceipt>
  save: (payload: CameraRegistration, receipt: TestReceipt, signal: AbortSignal) => Promise<Camera>
  release: (receipt: TestReceipt) => void
}
export const demoCameraKey = 'cctv-accessibility-ai:w10:demo-cameras:v1'
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
function browserStorage(): StoragePort { return window.localStorage }
export function readDemoCameras(storage: StoragePort = browserStorage()): Camera[] {
  try {
    const value = storage.getItem(demoCameraKey)
    if (!value) return []
    return parseList(JSON.parse(value))
  } catch { throw new Error('추가한 예시 목록을 읽지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.') }
}
export function withRegisteredDemoCameras(source: CameraSource, storage?: StoragePort): CameraSource {
  if (!source.demo) return source
  const target = storage ?? browserStorage()
  const hiddenKey = demoCameraKey + ':hidden'
  const hiddenIds = (): string[] => JSON.parse(target.getItem(hiddenKey) ?? '[]')
  return { ...source, remove: async id => {
    if (id.startsWith('demo-added-')) {
      target.setItem(demoCameraKey, JSON.stringify(readDemoCameras(target).filter(row => row.cameraId !== id)))
    } else {
      target.setItem(hiddenKey, JSON.stringify([...new Set([...hiddenIds(), id])]))
    }
  }, list: async (signal, attempt) => {
    const original = await source.list(signal, attempt)
    signal.throwIfAborted()
    return [...readDemoCameras(storage), ...original.filter(row => !hiddenIds().includes(row.cameraId))]
  } }
}
function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(signal.reason) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve() }, milliseconds)
    signal.addEventListener('abort', cancel, { once: true })
  })
}
// 실제 장치 연결은 수행하지 않는다. 성공 결과와 저장은 모두 시연 모드 전용이다.
export function createDemoCameraAddGateway(storage?: StoragePort, latency = 650): CameraAddGateway {
  const tests = new Map<string, { fingerprint: string; expiresAt: number; scenario: DemoScenario; saved?: Camera }>()
  return {
    demo: true,
    test: async (payload, scenario, signal) => {
      await delay(latency, signal)
      if (scenario === 'test-failure') throw new Error('시연용 연결 실패입니다. 주소나 인증 정보를 확인한 뒤 다시 테스트해 주세요.')
      const id = crypto.randomUUID()
      const expiresAt = Date.now() + 5 * 60_000
      for (const [key, test] of tests) if (test.expiresAt <= Date.now()) tests.delete(key)
      tests.set(id, { fingerprint: JSON.stringify(payload), expiresAt, scenario })
      return { id, expiresAt, demo: true }
    },
    save: async (payload, receipt, signal) => {
      await delay(latency, signal)
      const tested = tests.get(receipt.id)
      if (!tested || tested.expiresAt <= Date.now() || tested.fingerprint !== JSON.stringify(payload)) {
        throw new Error('입력 변경 또는 유효 시간 만료로 다시 연결 테스트가 필요합니다.')
      }
      if (tested.saved) return tested.saved
      if (tested.scenario === 'save-failure') throw new Error('시연용 저장 실패입니다. 입력은 유지됩니다. 저장을 다시 시도하거나 테스트 조건을 바꿔 주세요.')
      const saved: Camera = { cameraId: 'demo-added-' + receipt.id, name: payload.name, location: payload.location, status: 'online', lastSeenAt: new Date().toISOString() }
      // 비밀번호·RTSP 주소·장치 설정은 저장하지 않는다. 목록 확인용 메타데이터만 보관한다.
      const target = storage ?? browserStorage()
      const rows = readDemoCameras(target)
      if (rows.length >= 100) throw new Error('추가 가능한 예시 카메라는 100대까지입니다.')
      try { target.setItem(demoCameraKey, JSON.stringify([saved, ...rows])) }
      catch { throw new Error('예시 카메라를 저장하지 못했습니다. 브라우저 저장 공간과 권한을 확인해 주세요.') }
      tested.saved = saved
      return saved
    },
    release: receipt => { tests.delete(receipt.id) },
  }
}
// 현재 backend2에는 저장 전 테스트 API가 없다. 존재하지 않는 API를 호출하거나
// 실제 연결에 성공한 것처럼 표시하지 않고, 다음 통합 단계에서 이 구현만 교체한다.
export function createUnavailableCameraAddGateway(): CameraAddGateway {
  const unavailable = async (): Promise<never> => { throw new Error('저장 전 연결 테스트 API가 아직 연결되지 않았습니다. 현재 서버 모드에서는 카메라를 추가할 수 없습니다.') }
  return { demo: false, test: unavailable, save: unavailable, release: () => {} }
}
