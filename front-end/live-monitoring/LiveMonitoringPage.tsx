import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { filterCameras, type Camera, type CameraSource } from '../camera-list/cameraApi'
import { failureMessage } from '../shared/playerState'
import LiveTile from './LiveTile'
import { layoutLabels, layouts, pageCount, pageItems, parseLayout, parsePage, type Layout } from './layout'
import autoFocusIcon from './icons/auto-focus.svg'
import nextIcon from './icons/page-next.svg'
import previousIcon from './icons/page-prev.svg'
import './live-monitoring.css'

type Props = {
  source: CameraSource
}

export default function LiveMonitoringPage({ source }: Props) {
  const [rows, setRows] = useState<Camera[]>([])
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const current = useLocation()
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function load() {
      setLoading(true)
      setError('')
      try {
        const next = await source.list(signal, attempt)
        if (!signal.aborted) { setRows(next); setUpdated(true) }
      } catch (err) {
        if (!signal.aborted) setError(failureMessage(err))
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [source, attempt])

  // 레이아웃·위치·페이지는 쿼리에 두어 W02에서 돌아올 때 같은 배치를 다시 그린다.
  const layout = parseLayout(params.get('layout'))
  const locations = [...new Set(rows.map(row => row.location))]
  const wanted = params.get('location') ?? ''
  const location = locations.includes(wanted) ? wanted : ''
  const shown = filterCameras(rows, '', location, '')
  const pages = pageCount(shown.length, layout)
  const page = parsePage(params.get('page'), pages)
  const tiles = pageItems(shown, layout, page)

  // 레이아웃이나 위치를 바꾸면 1페이지로 돌아간다.
  function update(next: { layout?: Layout, location?: string, page?: number }) {
    setParams(previous => {
      const query = new URLSearchParams(previous)
      if (next.layout) query.set('layout', next.layout)
      if (next.location !== undefined) {
        if (next.location) query.set('location', next.location)
        else query.delete('location')
      }
      query.set('page', String(next.page ?? 1))
      return query
    }, { replace: true })
  }
  const open = (camera: Camera) =>
    navigate('/live/' + encodeURIComponent(camera.cameraId), { state: { from: current } })
  const refresh = () => setAttempt(value => value + 1)

  return <main className="w01">
    <header className="w01-head">
      <h1>라이브 관제</h1>
      <div className="w01-actions">
        <div className="w01-filters">
          <select aria-label="화면 배치" value={layout} onChange={e => update({ layout: parseLayout(e.target.value) })}>
            {(Object.keys(layouts) as Layout[]).map(key => <option key={key} value={key}>{layoutLabels[key]}</option>)}
          </select>
          <select aria-label="위치" value={location} onChange={e => update({ location: e.target.value })}>
            <option value="">전체 위치</option>{locations.map(item => <option key={item}>{item}</option>)}
          </select>
        </div>
        <nav className="w01-pages" aria-label="페이지 이동">
          <button aria-label="이전 페이지" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
            <img src={previousIcon} alt="" width={20} height={20} />
          </button>
          <span aria-live="polite">{page} / {pages}</span>
          <button aria-label="다음 페이지" disabled={page >= pages} onClick={() => update({ page: page + 1 })}>
            <img src={nextIcon} alt="" width={20} height={20} />
          </button>
        </nav>
        <span className="w01-autofocus"><img src={autoFocusIcon} alt="" width={20} height={20} />자동 포커스 ON</span>
      </div>
    </header>
    {error && <div role="alert" className="w01-alert">목록 조회 실패 · {error} {updated && '마지막으로 조회한 목록을 표시합니다.'} <button onClick={refresh}>다시 조회</button></div>}
    {loading && !updated && <p role="status" className="w01-message">카메라 목록을 불러오는 중입니다.</p>}
    {!loading && !error && !rows.length && <p className="w01-message">조회할 수 있는 카메라가 없습니다.</p>}
    {updated && rows.length > 0 && !shown.length && <div className="w01-message">선택한 위치에 카메라가 없습니다.
      <button onClick={() => update({ location: '' })}>전체 위치 보기</button></div>}
    {tiles.length > 0 && <ul className="w01-grid" data-layout={layout} aria-label={'카메라 ' + page + '페이지'}>
      {tiles.map(camera => <LiveTile key={camera.cameraId} camera={camera} source={source} onOpen={open} />)}
      {Array.from({ length: layouts[layout] - tiles.length }, (_, index) =>
        <li key={'empty-' + index} className="w01-empty" aria-hidden="true" />)}
    </ul>}
  </main>
}
