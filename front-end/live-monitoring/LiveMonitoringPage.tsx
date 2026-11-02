import { useRef, useState, type HTMLAttributes, type KeyboardEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { filterCameras, type Camera, type CameraSource } from '../camera-list/cameraApi'
import { useCameraList } from '../shared/useCameraList'
import LiveTile from './LiveTile'
import LiveTopBar from './LiveTopBar'
import { layoutLabels, layoutOptions, layouts, pageCount, parseLayout, parsePage, startView, type Layout } from './layout'
import { arrange, cellCount, hidden, hideOthers, moveSlot, neighbor, pageCells, readLayouts, saveLayout } from './order'

type Props = {
  source: CameraSource
  // 관제 설정(W04)에 저장한 기본 배치·위치. 주소에 값이 없을 때만 쓴다.
  preferred?: { layout: string, location: string }
}
// 재배치 중인 타일. target은 페이지 안 칸 번호. view가 바뀌면(배치·위치·페이지 변경) 자동으로 취소된다.
type Move = { id: string, target: number, view: string, keyboard: boolean }

export default function LiveMonitoringPage({ source, preferred }: Props) {
  const { rows, loading, error, updated, refresh } = useCameraList(source)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const current = useLocation()
  const [saved, setSaved] = useState(() => readLayouts())
  const [move, setMove] = useState<Move | null>(null)
  const [notice, setNotice] = useState('')
  const grid = useRef<HTMLUListElement>(null)
  // 놓은 뒤 타일이 DOM에서 옮겨지며 생기는 blur를 취소로 보지 않는다.
  const settling = useRef(false)

  // 레이아웃·위치·페이지는 쿼리에 두어 W02에서 돌아올 때 같은 배치를 다시 그린다.
  const { layout, location: wanted } = startView(params, preferred)
  const locations = [...new Set(rows.map(row => row.location))]
  // 목록에 없는 위치(설정의 기본 위치 포함)는 전체 위치로 연다.
  const location = locations.includes(wanted) ? wanted : ''
  const shown = filterCameras(rows, '', location, '')
  // 그리드마다 저장한 칸 배치. 위치 필터 중에도 칸 번호는 그대로 두고 다른 위치 칸은 비워 보인다.
  const slots = arrange(rows, saved[layout])
  const cells = location ? hideOthers(slots, row => row.location === location) : slots
  const pages = pageCount(cellCount(cells), layout)
  const page = parsePage(params.get('page'), pages)
  const start = (page - 1) * layouts[layout]
  const items = pageCells(cells, layout, page)
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
  // W02가 지금 보이는 배치(관제 설정값으로 정해진 경우 포함)를 이어받도록 실제 배치·위치·페이지를 넘긴다.
  function open(camera: Camera) {
    const query = new URLSearchParams(current.search)
    query.set('layout', layout)
    query.set('location', location)
    query.set('page', String(page))
    navigate('/live/' + encodeURIComponent(camera.cameraId),
      { state: { from: { pathname: current.pathname, search: '?' + query } } })
  }

  // 같은 페이지의 index번째 칸에 놓는다. 카메라 칸이면 맞바꾸고, 빈 칸이면 그 칸으로 옮긴다.
  // 1+5에서 큰 칸에 놓으면 메인 카메라가 바뀐다. 배치는 지금 그리드에만 저장한다.
  function place(id: string, index: number) {
    setMove(null)
    const from = slots.findIndex(row => row?.cameraId === id)
    const picked = slots[from]
    const other = items[index]
    if (!picked || other === hidden || from === start + index) {
      setNotice('제자리에 놓았습니다.')
      return
    }
    const next = moveSlot(slots.map(row => row?.cameraId ?? null), from, start + index)
    setSaved(current => ({ ...current, [layout]: next }))
    setNotice((other ? `‘${picked.name}’, ‘${other.name}’ 카메라의 자리를 바꿨습니다.`
      : `‘${picked.name}’ 카메라를 ${index + 1}번째 빈 칸으로 옮겼습니다.`) +
      (saveLayout(layout, next) ? '' : ' 브라우저에 저장하지 못해 이 화면에서만 적용됩니다.'))
  }
  function resetOrder() {
    setSaved(current => ({ ...current, [layout]: undefined }))
    saveLayout(layout, null)
    setNotice(layoutLabels[layout] + ' 배치를 기본 순서로 되돌렸습니다.')
  }
  function describe(index: number) {
    const item = items[index]
    return `${index + 1}번째 칸, ` + (item === hidden ? '다른 위치 카메라 자리라서 놓을 수 없습니다'
      : item ? `‘${item.name}’` : '빈 칸')
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
      const target = neighbor(active.target, event.key, layout)
      setMove({ ...active, target })
      setNotice(describe(target))
    } else if (event.key === ' ') {
      event.preventDefault()
      // 다른 위치 카메라 자리는 놓을 수 없어 집은 상태를 유지한다.
      if (items[active.target] === hidden) return setNotice(describe(active.target))
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

  // 마우스: 타일 어디든 끌어 다른 칸에 놓는다. 마우스를 움직여야 시작돼서 더블클릭·재시도 버튼과 겹치지 않는다.
  const drag = (camera: Camera, index: number): HTMLAttributes<HTMLLIElement> => ({
    draggable: true,
    onDragStart: event => {
      const tile = event.currentTarget
      const box = tile.getBoundingClientRect()
      event.dataTransfer.setDragImage(tile, event.clientX - box.left, event.clientY - box.top)
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
  const moving = (id: string | null, index: number) =>
    !active ? undefined : active.id === id ? 'source' : active.target === index ? 'target' : undefined
  const visible = slots.some(row => row && (!location || row.location === location))

  return <main className="w01">
    <LiveTopBar layout={layout} layoutOptions={layoutOptions} onLayout={value => update({ layout: parseLayout(value) })}
      locations={locations} location={location} onLocation={value => update({ location: value })}
      unit="페이지" position={page + ' / ' + pages}
      onPrevious={page > 1 ? () => update({ page: page - 1 }) : undefined}
      onNext={page < pages ? () => update({ page: page + 1 }) : undefined}
      onResetOrder={saved[layout]?.length ? resetOrder : undefined} />
    <p className="w01-sr" aria-live="polite">{notice}</p>
    {error && <div role="alert" className="w01-alert">목록 조회 실패 · {error} {updated && '마지막으로 조회한 목록을 표시합니다.'} <button onClick={refresh}>다시 조회</button></div>}
    {loading && !updated && <p role="status" className="w01-message">카메라 목록을 불러오는 중입니다.</p>}
    {!loading && !error && !rows.length && <p className="w01-message">조회할 수 있는 카메라가 없습니다.</p>}
    {updated && rows.length > 0 && !shown.length && <div className="w01-message">선택한 위치에 카메라가 없습니다.
      <button onClick={() => update({ location: '' })}>전체 위치 보기</button></div>}
    {visible && <ul ref={grid} className="w01-grid" data-layout={layout} aria-label={'카메라 ' + page + '페이지'}>
      {items.map((item, index) => item && item !== hidden
        ? <LiveTile key={item.cameraId} camera={item} source={source} onOpen={open}
          moving={moving(item.cameraId, index)} onKeyDown={event => keyDown(event, item, index)} onBlur={() => blur(item)}
          dnd={{ ...drag(item, index), ...drop(index) }} />
        // 빈 칸은 놓을 수 있고, 다른 위치 카메라 자리는 비워 보이되 놓을 수 없다.
        : <li key={'slot-' + (start + index)} aria-hidden="true"
          className={'w01-empty' + (item === hidden ? ' is-other' : '') + (moving(null, index) === 'target' ? ' is-target' : '')}
          {...(item === hidden ? {} : drop(index))}>{item === hidden && <span>다른 위치</span>}</li>)}
    </ul>}
  </main>
}
