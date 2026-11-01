import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { filterCameras, type Camera, type CameraSource } from '../camera-list/cameraApi'
import { useCameraList } from '../shared/useCameraList'
import LiveTile from './LiveTile'
import LiveTopBar from './LiveTopBar'
import { layoutOptions, layouts, pageCount, pageItems, parseLayout, parsePage, type Layout } from './layout'

type Props = {
  source: CameraSource
}

export default function LiveMonitoringPage({ source }: Props) {
  const { rows, loading, error, updated, refresh } = useCameraList(source)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const current = useLocation()

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

  return <main className="w01">
    <LiveTopBar layout={layout} layoutOptions={layoutOptions} onLayout={value => update({ layout: parseLayout(value) })}
      locations={locations} location={location} onLocation={value => update({ location: value })}
      unit="페이지" position={page + ' / ' + pages}
      onPrevious={page > 1 ? () => update({ page: page - 1 }) : undefined}
      onNext={page < pages ? () => update({ page: page + 1 }) : undefined} />
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
