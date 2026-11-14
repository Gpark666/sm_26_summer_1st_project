import { useEffect, useRef, useState } from 'react'
import { filterCameras, type Camera, type CameraSource } from './cameraApi'
import './camera-list.css'

type Props = {
  source: CameraSource
  onOpenLive: (camera: Camera, session: unknown) => void
  onAddCamera?: () => void
}
const clock = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
function time(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return clock.format(new Date(value))
}
function reason(error: unknown) {
  return error instanceof Error && !['TypeError', 'TimeoutError'].includes(error.name)
    ? error.message : '서버 연결을 확인한 뒤 다시 시도해 주세요.'
}

export default function CameraListPage({ source, onOpenLive, onAddCamera }: Props) {
  const [rows, setRows] = useState<Camera[]>([])
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('')
  const [opening, setOpening] = useState('')
  const [playErrors, setPlayErrors] = useState<Record<string, string>>({})
  const flight = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function load() {
      setLoading(true)
      setError('')
      try {
        const next = await source.list(signal, attempt)
        if (!signal.aborted) { setRows(next); setUpdated(new Date().toISOString()) }
      } catch (err) {
        if (!signal.aborted) setError(reason(err))
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [source, attempt])
  useEffect(() => () => flight.current?.abort(), [])

  async function open(camera: Camera) {
    if (flight.current) return
    const controller = new AbortController()
    flight.current = controller
    setOpening(camera.cameraId)
    setPlayErrors(previous => ({ ...previous, [camera.cameraId]: '' }))
    try {
      const session = await source.playback(camera, controller.signal)
      if (!controller.signal.aborted) onOpenLive(camera, session)
    } catch (err) {
      if (!controller.signal.aborted) setPlayErrors(previous => ({ ...previous, [camera.cameraId]: reason(err) }))
    } finally {
      flight.current = null
      if (!controller.signal.aborted) setOpening('')
    }
  }

  const online = rows.filter(row => row.status === 'online').length
  const locations = [...new Set(rows.map(row => row.location).concat(location ? [location] : []))]
  const shown = filterCameras(rows, query, location, status)
  const refresh = () => setAttempt(value => value + 1)
  const reset = () => { setQuery(''); setLocation(''); setStatus('') }

  return <main className="w03">
    <header className="w03-head"><h1>카메라 목록</h1><span>{source.demo ? '예시 데이터' : '서버 데이터'}</span></header>
    <div className="w03-body">
      <section className="w03-summary" aria-label="조회된 카메라 현황">
        {([['조회된 카메라', rows.length, 'total'], ['온라인', online, 'online'], ['오프라인', rows.length - online, 'offline']] as const)
          .map(([label, count, style]) => <div className="w03-card" key={style}>
            <span className={'w03-pill ' + style}>{label}</span><strong>{updated ? count + '대' : '—'}</strong>
          </div>)}
      </section>
      <section className="w03-tools" aria-label="검색과 조회">
        <label>카메라 검색<input type="search" placeholder="카메라명 또는 위치 검색" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label>위치<select value={location} onChange={e => setLocation(e.target.value)}>
          <option value="">전체 위치</option>{locations.map(item => <option key={item}>{item}</option>)}
        </select></label>
        <label>상태<select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">전체 상태</option><option value="online">온라인</option><option value="offline">오프라인</option>
        </select></label>
        <div className="w03-actions">
          <button disabled={loading} onClick={refresh}>{loading ? '조회 중…' : '상태 새로고침'}</button>
          <button disabled={!onAddCamera} onClick={onAddCamera} title={onAddCamera ? '카메라 등록' : '카메라 등록 기능 준비 중'}>+ 카메라 추가</button>
        </div>
      </section>
      {error && <div role="alert" className="w03-alert">목록 조회 실패 · {error} {updated && '마지막으로 조회한 목록을 표시합니다.'} <button onClick={refresh}>다시 조회</button></div>}
      <section className="w03-panel" aria-label="카메라 조회 결과" aria-busy={loading}>
        <div className="w03-panel-head"><h2>카메라 목록 {updated && '· ' + shown.length}</h2><small>{updated ? '마지막 업데이트 ' + time(updated) : '조회 대기'}</small></div>
        {loading && <p role="status" className="w03-message">카메라 목록을 불러오는 중입니다.</p>}
        {updated && shown.length > 0 && <div className="w03-scroll"><table>
          <thead><tr>{['카메라명','위치','상태','마지막 응답','연결 정보','작업'].map(col => <th scope="col" key={col}>{col}</th>)}</tr></thead>
          <tbody>{shown.map(row => <tr key={row.cameraId}>
            <th scope="row">{row.name}</th><td>{row.location}</td>
            <td><span className={'w03-pill ' + row.status}>{row.status === 'online' ? '온라인' : '오프라인'}</span></td>
            <td><time dateTime={row.lastSeenAt ?? undefined} title={row.lastSeenAt ?? undefined}>{time(row.lastSeenAt)}</time></td>
            <td>{row.status === 'online' ? '장비 응답 정상' : '장비 연결 끊김'}
              {playErrors[row.cameraId] && <div className="w03-play-error" role="alert">영상 연결 실패 · {playErrors[row.cameraId]}</div>}</td>
            <td><button disabled={!!opening} onClick={() => void open(row)}>
              {opening === row.cameraId ? '요청 중…' : (row.status === 'offline' || playErrors[row.cameraId]) ? '영상 재연결' : '실시간 영상 보기'}
            </button></td>
          </tr>)}</tbody>
        </table></div>}
        {!loading && !error && !rows.length && <p className="w03-message">조회할 수 있는 카메라가 없습니다.</p>}
        {!loading && updated && rows.length > 0 && !shown.length && <div className="w03-message">검색 조건에 맞는 카메라가 없습니다. <button onClick={reset}>조건 초기화</button></div>}
        {updated && <footer>조회된 {rows.length}대 중 {shown.length}대 표시</footer>}
      </section>
      <p className="w03-note">카메라 상태는 장비 응답을 기준으로 표시합니다. 영상 연결에 실패하면 해당 행에서 재연결하세요.</p>
    </div>
  </main>
}
