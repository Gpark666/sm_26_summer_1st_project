import { useEffect, useEffectEvent, useState, type MouseEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import type { Camera, CameraSource } from '../camera-list/cameraApi'
import LiveTopBar from '../live-monitoring/LiveTopBar'
import { layoutOptions, pageOf, parseLayout, type Layout } from '../live-monitoring/layout'
import { arrange, readLayouts } from '../live-monitoring/order'
import VideoPlayer from '../shared/VideoPlayer'
import { useCameraList } from '../shared/useCameraList'
import { backTarget, readFrom, readMoved, returnTo } from './returnPath'
import './camera-zoom.css'

type Props = {
  source: CameraSource
}

// W02는 라이브 관제의 1×1 배치다. 위치·배치는 W01 주소(state.from)의 쿼리를 이어받는다.
export default function CameraZoomPage({ source }: Props) {
  const { cameraId = '' } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const from = readFrom(state)
  const moved = readMoved(state)
  const { rows, loading, error, updated, refresh } = useCameraList(source)
  // W01에서 바꾼 그리드별 칸 배치를 그대로 따른다.
  const [saved] = useState(() => readLayouts())
  const slotsOf = (target: Layout) => arrange(rows, saved[target])

  const context = new URLSearchParams(from?.search)
  const layout = parseLayout(context.get('layout'))
  const camera = rows.find(row => row.cameraId === cameraId)
  const locations = [...new Set(rows.map(row => row.location))]
  const wanted = context.get('location') ?? ''
  // 이전/다음은 W01과 같은 칸 순서(빈자리 제외)로 넘긴다.
  const ordered = slotsOf(layout).filter((row): row is Camera => row !== null)
  const filtered = locations.includes(wanted) ? ordered.filter(row => row.location === wanted) : ordered
  // 직접 들어온 카메라가 이어받은 위치에 없으면 전체 위치 기준으로 넘긴다.
  const inFilter = !camera || filtered.includes(camera)
  const location = inFilter && locations.includes(wanted) ? wanted : ''
  const shown = inFilter ? filtered : ordered
  const index = camera ? shown.indexOf(camera) : -1

  // 그 그리드의 칸 배치에서 카메라가 있는 W01 페이지로 돌아간다. 필터 중에도 칸 번호는 같다.
  const returnAt = (nextLayout: Layout, nextLocation: string, id = '') =>
    returnTo(from?.search ?? '', nextLayout, nextLocation,
      pageOf(slotsOf(nextLayout).findIndex(row => row?.cameraId === id), nextLayout))
  const back = () => {
    const target = backTarget(from, moved)
    if (target === -1) navigate(-1)
    else navigate(target, { replace: true })
  }
  const show = (target: Camera, nextLocation: string) =>
    navigate('/live/' + encodeURIComponent(target.cameraId),
      { replace: true, state: { from: returnAt(layout, nextLocation, target.cameraId), moved: true } })
  function changeLocation(value: string) {
    const first = ordered.find(row => !value || row.location === value)
    if (first) show(first, value)
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
      onLayout={value => { if (value !== '1x1') navigate(returnAt(parseLayout(value), location, camera?.cameraId), { replace: true }) }}
      locations={locations} location={location} onLocation={changeLocation}
      unit="카메라" position={camera ? (index + 1) + ' / ' + shown.length : '– / –'}
      onPrevious={index > 0 ? () => show(shown[index - 1], location) : undefined}
      onNext={camera && index < shown.length - 1 ? () => show(shown[index + 1], location) : undefined}
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
