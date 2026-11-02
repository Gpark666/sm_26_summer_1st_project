import { useRef, useState, type HTMLAttributes, type KeyboardEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { filterCameras, type Camera, type CameraSource } from '../camera-list/cameraApi'
import { useCameraList } from '../shared/useCameraList'
import LiveTile from './LiveTile'
import LiveTopBar from './LiveTopBar'
import { layoutOptions, layouts, pageCount, pageItems, parseLayout, parsePage, startView, type Layout } from './layout'
import { applyOrder, neighbor, readOrder, saveOrder, swapOrder } from './order'

type Props = {
  source: CameraSource
  // 관제 설정(W04)에 저장한 기본 배치·위치. 주소에 값이 없을 때만 쓴다.
  preferred?: { layout: string, location: string }
}
// 재배치 중인 타일. view가 바뀌면(배치·위치·페이지 변경) 자동으로 취소된다.
type Move = { id: string, target: number, view: string, keyboard: boolean }

export default function LiveMonitoringPage({ source, preferred }: Props) {
  const { rows, loading, error, updated, refresh } = useCameraList(source)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const current = useLocation()
  const [order, setOrder] = useState(() => readOrder())
  const [move, setMove] = useState<Move | null>(null)
  const [notice, setNotice] = useState('')
  const grid = useRef<HTMLUListElement>(null)
  // 놓은 뒤 타일이 DOM에서 옮겨지며 생기는 blur를 취소로 보지 않는다.
  const settling = useRef(false)

  // 레이아웃·위치·페이지는 쿼리에 두어 W02에서 돌아올 때 같은 배치를 다시 그린다.
  const { layout, location: wanted } = startView(params, preferred)
  const ordered = applyOrder(rows, order)
  const locations = [...new Set(rows.map(row => row.location))]
  // 목록에 없는 위치(설정의 기본 위치 포함)는 전체 위치로 연다.
  const location = locations.includes(wanted) ? wanted : ''
  const shown = filterCameras(ordered, '', location, '')
  const pages = pageCount(shown.length, layout)
  const page = parsePage(params.get('page'), pages)
  const tiles = pageItems(shown, layout, page)
  const view = [layout, location, page].join('|')
  const active = move?.view === view ? move : null

  // 레이아웃이나 위치를 바꾸면 1페이지로 돌아간다.
  function update(next: { layout?: Layout, location?: string, page?: number }) {
    setParams(previous => {
      const query = new URLSearchParams(previous)
      if (next.layout) query.set('layout', next.layout)
      // '전체 위치'도 빈 값으로 남겨 설정의 기본 위치로 되돌아가지 않게 한다.
      if (next.location !== undefined) query.set('location', next.location)
      query.set('page', String(next.page ?? 1))
      return query
    }, { replace: true })
  }
  const open = (camera: Camera) =>
    navigate('/live/' + encodeURIComponent(camera.cameraId), { state: { from: current } })

  // 같은 페이지의 두 타일 자리를 바꾸고 브라우저에 저장한다. 1+5에서 큰 칸에 놓으면 메인 카메라가 바뀐다.
  function place(id: string, index: number) {
    setMove(null)
    const picked = tiles.find(tile => tile.cameraId === id)
    const other = tiles[index]
    if (!picked || !other || other.cameraId === id) {
      setNotice('제자리에 놓았습니다.')
      return
    }
    const next = swapOrder(ordered.map(row => row.cameraId), id, other.cameraId)
    setOrder(next)
    setNotice(`‘${picked.name}’, ‘${other.name}’ 카메라의 자리를 바꿨습니다.` +
      (saveOrder(next) ? '' : ' 브라우저에 저장하지 못해 이 화면에서만 적용됩니다.'))
  }
  function resetOrder() {
    setOrder([])
    saveOrder(null)
    setNotice('기본 순서로 되돌렸습니다.')
  }

  // 키보드: Space로 집기 → 방향키로 칸 고르기 → Space로 놓기, Esc로 취소
  function keyDown(event: KeyboardEvent<HTMLLIElement>, camera: Camera, index: number) {
    if (event.target !== event.currentTarget) return
    if (!(active?.keyboard && active.id === camera.cameraId)) {
      if (event.key === 'Enter') open(camera)
      else if (event.key === ' ') {
        event.preventDefault()
        setMove({ id: camera.cameraId, target: index, view, keyboard: true })
        setNotice(`‘${camera.name}’ 카메라를 집었습니다. 방향키로 옮길 칸을 고르고 Space로 놓으세요. 취소하려면 Esc를 누르세요.`)
      }
      return
    }
    if (event.key.startsWith('Arrow')) {
      event.preventDefault()
      const target = neighbor(active.target, event.key, layout, tiles.length)
      setMove({ ...active, target })
      setNotice(`${target + 1}번째 칸, ‘${tiles[target].name}’`)
    } else if (event.key === ' ') {
      event.preventDefault()
      settling.current = true
      place(camera.cameraId, active.target)
      requestAnimationFrame(() => {
        grid.current?.querySelector<HTMLElement>(`[data-camera-id="${CSS.escape(camera.cameraId)}"]`)?.focus()
        settling.current = false
      })
    } else if (event.key === 'Escape') {
      setMove(null)
      setNotice('옮기기를 취소했습니다.')
    } else if (event.key === 'Enter') event.preventDefault()
  }
  function blur(camera: Camera) {
    if (settling.current || !active?.keyboard || active.id !== camera.cameraId) return
    setMove(null)
    setNotice('옮기기를 취소했습니다.')
  }

  // 마우스: 상단 바를 끌어 다른 타일 위에 놓는다.
  const handle = (camera: Camera, index: number): HTMLAttributes<HTMLDivElement> => ({
    draggable: true,
    onDragStart: event => {
      const tile = event.currentTarget.closest('li')
      if (tile) {
        const box = tile.getBoundingClientRect()
        event.dataTransfer.setDragImage(tile, event.clientX - box.left, event.clientY - box.top)
      }
      event.dataTransfer.setData('text/plain', camera.cameraId)
      event.dataTransfer.effectAllowed = 'move'
      // dragstart 중에 DOM을 바꾸면 브라우저가 드래그를 취소할 수 있어 다음 틱에 표시한다.
      setTimeout(() => setMove({ id: camera.cameraId, target: index, view, keyboard: false }))
    },
    onDragEnd: () => setMove(null),
  })
  const drop = (index: number): Pick<HTMLAttributes<HTMLLIElement>, 'onDragOver' | 'onDrop'> => ({
    onDragOver: event => {
      if (!active || active.keyboard) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (active.target !== index) setMove({ ...active, target: index })
    },
    onDrop: event => {
      if (!active || active.keyboard) return
      event.preventDefault()
      place(active.id, index)
    },
  })
  const moving = (camera: Camera, index: number) =>
    !active ? undefined : active.id === camera.cameraId ? 'source' : active.target === index ? 'target' : undefined

  return <main className="w01">
    <LiveTopBar layout={layout} layoutOptions={layoutOptions} onLayout={value => update({ layout: parseLayout(value) })}
      locations={locations} location={location} onLocation={value => update({ location: value })}
      unit="페이지" position={page + ' / ' + pages}
      onPrevious={page > 1 ? () => update({ page: page - 1 }) : undefined}
      onNext={page < pages ? () => update({ page: page + 1 }) : undefined}
      onResetOrder={order.length ? resetOrder : undefined} />
    <p className="w01-sr" aria-live="polite">{notice}</p>
    {error && <div role="alert" className="w01-alert">목록 조회 실패 · {error} {updated && '마지막으로 조회한 목록을 표시합니다.'} <button onClick={refresh}>다시 조회</button></div>}
    {loading && !updated && <p role="status" className="w01-message">카메라 목록을 불러오는 중입니다.</p>}
    {!loading && !error && !rows.length && <p className="w01-message">조회할 수 있는 카메라가 없습니다.</p>}
    {updated && rows.length > 0 && !shown.length && <div className="w01-message">선택한 위치에 카메라가 없습니다.
      <button onClick={() => update({ location: '' })}>전체 위치 보기</button></div>}
    {tiles.length > 0 && <ul ref={grid} className="w01-grid" data-layout={layout} aria-label={'카메라 ' + page + '페이지'}>
      {tiles.map((camera, index) => <LiveTile key={camera.cameraId} camera={camera} source={source} onOpen={open}
        moving={moving(camera, index)} onKeyDown={event => keyDown(event, camera, index)} onBlur={() => blur(camera)}
        handle={handle(camera, index)} drop={drop(index)} />)}
      {Array.from({ length: layouts[layout] - tiles.length }, (_, index) =>
        <li key={'empty-' + index} className="w01-empty" aria-hidden="true" />)}
    </ul>}
  </main>
}
