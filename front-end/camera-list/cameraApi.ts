export type Camera = {
  cameraId: string
  name: string
  location: string
  status: 'online' | 'offline'
  lastSeenAt: string | null
}

export type CameraSource = {
  demo: boolean
  list: (signal: AbortSignal, attempt: number) => Promise<Camera[]>
  playback: (camera: Camera, signal: AbortSignal) => Promise<unknown>
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// API 응답이 예상과 다르면 '카메라 없음'으로 잘못 표시하지 않는다.
export function parseList(payload: unknown): Camera[] {
  const rows = record(payload) ? payload.items : payload
  if (!Array.isArray(rows)) throw new Error('카메라 목록 응답 형식을 확인해 주세요.')
  const ids = new Set<string>()
  return rows.map((row: unknown) => {
    if (!record(row) ||
        (typeof row.cameraId !== 'string' && typeof row.cameraId !== 'number') ||
        typeof row.name !== 'string' ||
        (row.location != null && typeof row.location !== 'string') ||
        (row.lastSeenAt != null && typeof row.lastSeenAt !== 'string') ||
        (row.status !== 'online' && row.status !== 'offline')) {
      throw new Error('카메라 정보의 필드나 상태값을 확인해 주세요.')
    }
    const cameraId = String(row.cameraId)
    if (!cameraId.trim() || ids.has(cameraId)) throw new Error('카메라 식별자를 확인해 주세요.')
    ids.add(cameraId)
    return { cameraId, name: row.name, location: row.location || '위치 미등록',
      status: row.status, lastSeenAt: row.lastSeenAt || null }
  })
}

async function request(url: string, method: 'GET' | 'POST', signal: AbortSignal) {
  const res = await fetch(url, { method, credentials: 'include',
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (res.status === 401) throw new Error('로그인이 필요합니다.')
  if (res.status === 403) throw new Error('이 카메라에 접근할 권한이 없습니다.')
  if (!res.ok) throw new Error('서버 요청에 실패했습니다. (' + res.status + ')')
  if (res.status === 204) return null
  if (!res.headers.get('content-type')?.includes('json')) {
    throw new Error('API 주소와 서버의 JSON 응답을 확인해 주세요.')
  }
  return res.json() as Promise<unknown>
}

export function realSource(base = '/api/v1'): CameraSource {
  const root = base.replace(/\/+$/, '')
  return {
    demo: false,
    list: async signal => parseList(await request(root + '/cameras', 'GET', signal)),
    playback: (camera, signal) => request(root + '/cameras/' +
      encodeURIComponent(camera.cameraId) + '/playback-session', 'POST', signal),
  }
}

export function demoSource(scenario = ''): CameraSource {
  async function wait(signal: AbortSignal) {
    await new Promise(resolve => setTimeout(resolve, 350))
    signal.throwIfAborted()
  }
  return {
    demo: true,
    list: async (signal, attempt) => {
      await wait(signal)
      if (scenario === 'error' && attempt === 0) throw new Error('테스트용 조회 실패입니다.')
      if (scenario === 'empty') return []
      const seen = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString()
      const rows: Camera[] = [
        { cameraId: 'cam-01', name: '정문 점자블록', location: '본관 1층', status: 'online', lastSeenAt: seen(1) },
        { cameraId: 'cam-02', name: '1층 경사로', location: '본관 1층', status: 'online', lastSeenAt: seen(5) },
        { cameraId: 'cam-03', name: '동측 보행로', location: '동측 외부', status: 'offline', lastSeenAt: seen(95) },
        { cameraId: 'cam-04', name: '서측 출입구', location: '서관 1층', status: 'offline', lastSeenAt: null },
      ]
      if (scenario !== 'many') return rows
      // W01 레이아웃·페이지 이동 확인용 18대 (1+5 → 3쪽, 2×2 → 5쪽, 3×3 → 2쪽)
      return rows.concat([
        ['2층 엘리베이터 앞', '본관 2층'], ['2층 화장실 입구', '본관 2층'], ['중앙 계단', '본관 2층'],
        ['주차장 장애인 구역', '지하 1층'], ['주차장 엘리베이터', '지하 1층'], ['서관 경사로', '서관 1층'],
        ['서관 안내데스크', '서관 1층'], ['후문 횡단보도', '동측 외부'], ['버스 정류장 연결로', '동측 외부'],
        ['3층 휴게실', '본관 3층'], ['3층 복도', '본관 3층'], ['옥상 정원 입구', '본관 3층'],
        ['북측 보행로', '북측 외부'], ['북측 출입구', '북측 외부'],
      ].map(([name, location], index) => ({
        cameraId: 'cam-' + String(index + 5).padStart(2, '0'), name, location,
        status: index % 4 === 3 ? 'offline' : 'online',
        lastSeenAt: index % 4 === 3 ? seen(120 + index * 30) : seen(index + 1),
      })))
    },
    playback: async (camera, signal) => {
      await wait(signal)
      if (camera.status === 'offline') throw new Error('카메라가 오프라인입니다. 장비 연결을 확인해 주세요.')
      return { cameraId: camera.cameraId, demo: true }
    },
  }
}

export function filterCameras(rows: Camera[], query: string, location: string, status: string) {
  const q = query.trim().toLowerCase()
  return rows.filter(row => (!location || row.location === location) &&
    (!status || row.status === status) &&
    [row.name, row.location].some(field => field.toLowerCase().includes(q)))
}
