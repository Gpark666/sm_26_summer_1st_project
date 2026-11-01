import { useEffect, useEffectEvent, type MouseEvent } from 'react'
import { useLocation, useNavigate, useParams, type Path } from 'react-router'
import { filterCameras, type Camera, type CameraSource } from '../camera-list/cameraApi'
import LiveTopBar from '../live-monitoring/LiveTopBar'
import { layoutOptions, pageOf, parseLayout, type Layout } from '../live-monitoring/layout'
import VideoPlayer from '../shared/VideoPlayer'
import { useCameraList } from '../shared/useCameraList'
import './camera-zoom.css'

type Props = {
  source: CameraSource
}
type From = Pick<Path, 'pathname' | 'search'>
function readFrom(state: unknown): From | null {
  const from = (state as { from?: Partial<From> } | null)?.from
  return typeof from?.pathname === 'string' ? { pathname: from.pathname, search: from.search ?? '' } : null
}

// W02는 라이브 관제의 1×1 배치다. 위치·배치는 W01 주소(state.from)의 쿼리를 이어받는다.
export default function CameraZoomPage({ source }: Props) {
  const { cameraId = '' } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const from = readFrom(state)
  // W02 안에서 카메라를 넘기면 moved가 붙는다.
  const moved = (state as { moved?: boolean } | null)?.moved === true
  const { rows, loading, error, updated, refresh } = useCameraList(source)

  const context = new URLSearchParams(from?.search)
  const layout = parseLayout(context.get('layout'))
  const camera = rows.find(row => row.cameraId === cameraId)
  const locations = [...new Set(rows.map(row => row.location))]
  const wanted = context.get('location') ?? ''
  const filtered = filterCameras(rows, '', locations.includes(wanted) ? wanted : '', '')
  // 직접 들어온 카메라가 이어받은 위치에 없으면 전체 위치 기준으로 넘긴다.
  const inFilter = !camera || filtered.includes(camera)
  const location = inFilter && locations.includes(wanted) ? wanted : ''
  const shown = inFilter ? filtered : rows
  const index = camera ? shown.indexOf(camera) : -1

  function returnTo(nextLayout: Layout, nextLocation: string, at: number): From {
    const query = new URLSearchParams(context)
    query.set('layout', nextLayout)
    if (nextLocation) query.set('location', nextLocation)
    else query.delete('location')
    query.set('page', String(pageOf(at, nextLayout)))
    return { pathname: '/live', search: '?' + query }
  }
  // W01에서 바로 들어왔으면 기록을 되돌리고, 넘겼거나 직접 들어왔으면 복귀 주소로 바꿔치기한다.
  const back = () => { if (from && !moved) navigate(-1); else navigate(from ?? '/live', { replace: true }) }
  const show = (target: Camera, nextLocation: string, at: number) =>
    navigate('/live/' + encodeURIComponent(target.cameraId),
      { replace: true, state: { from: returnTo(layout, nextLocation, at), moved: true } })
  function changeLocation(value: string) {
    const [first] = filterCameras(rows, '', value, '')
    if (first) show(first, value, 0)
  }

  const escape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.defaultPrevented && !(event.target instanceof HTMLSelectElement)) back()
  })
  useEffect(() => {
    const listener = (event: KeyboardEvent) => escape(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
  function doubleClick(event: MouseEvent<HTMLElement>) {
    if (!(event.target as HTMLElement).closest('button')) back()
  }

  return <main className="w01 w02">
    <LiveTopBar layout="1x1" layoutOptions={[['1x1', '1×1'], ...layoutOptions]}
      onLayout={value => { if (value !== '1x1') navigate(returnTo(parseLayout(value), location, index), { replace: true }) }}
      locations={locations} location={location} onLocation={changeLocation}
      unit="카메라" position={camera ? (index + 1) + ' / ' + shown.length : '– / –'}
      onPrevious={index > 0 ? () => show(shown[index - 1], location, index - 1) : undefined}
      onNext={camera && index < shown.length - 1 ? () => show(shown[index + 1], location, index + 1) : undefined}
      onBack={back} />
    {error && <div role="alert" className="w01-alert">목록 조회 실패 · {error} {updated && '마지막으로 조회한 목록을 표시합니다.'} <button onClick={refresh}>다시 조회</button></div>}
    {loading && !updated && <p role="status" className="w01-message">카메라 목록을 불러오는 중입니다.</p>}
    {updated && !camera && <div role="alert" className="w01-message w02-missing">
      <strong>카메라를 찾을 수 없음</strong>
      <p>‘{cameraId}’ 카메라가 목록에 없습니다. 삭제되었거나 주소가 잘못되었을 수 있습니다.</p>
      <button onClick={back}>라이브 관제로 돌아가기</button>
    </div>}
    {camera && <section className="w02-stage" aria-label={camera.name + ' 확대'} onDoubleClick={doubleClick}>
      <div className="w02-player"><VideoPlayer camera={camera} source={source} showLocation /></div>
    </section>}
  </main>
}
