import { useEffect, useRef, useState } from 'react'
import { filterCameras, type Camera } from '../camera-list/cameraApi'
import type { Layout } from './layout'
import { positionOf } from './order'

type Props = {
  // 카메라를 넣을 전체 칸 번호(0부터)와 지금 그리드·위치의 칸 배치
  slot: number
  layout: Layout
  slots: readonly (Camera | null)[]
  onPick: (camera: Camera) => void
  onClose: () => void
}

// 카메라가 많아 그리드에 없는 카메라도 이 칸으로 바로 가져올 수 있게 고르는 창
export default function CameraPicker({ slot, layout, slots, onPick, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    dialog.current?.showModal()
    search.current?.focus()
  }, [])

  const close = () => dialog.current?.close()
  const target = positionOf(slot, layout)
  const placed = slots.flatMap((row, index) => row ? [{ row, index }] : [])
  const matches = new Set(filterCameras(placed.map(item => item.row), query, '', ''))
  const shown = placed.filter(item => matches.has(item.row))

  return <dialog ref={dialog} className="w01-picker" aria-labelledby="w01-picker-title" onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) close() }}>
    <div className="w01-picker-body">
      <header>
        <h2 id="w01-picker-title">{target.cell}번째 {slots[slot] ? '칸에 볼 카메라' : '빈 칸에 넣을 카메라'}</h2>
        <button className="w01-picker-close" aria-label="닫기" onClick={close}>×</button>
      </header>
      <input ref={search} type="search" aria-label="카메라 검색" placeholder="카메라명 또는 위치 검색"
        value={query} onChange={event => setQuery(event.target.value)} />
      {shown.length ? <ul>
        {shown.map(({ row, index }) => {
          const at = positionOf(index, layout)
          return <li key={row.cameraId}>
            <button disabled={index === slot} onClick={() => onPick(row)}>
              <span className={'w01-picker-dot ' + row.status} aria-hidden="true" />
              <strong>{row.name}</strong>
              <span>{row.location} · {row.status === 'online' ? '온라인' : '오프라인'}</span>
              <small>{index === slot ? '이 칸' : `${at.page}쪽 ${at.cell}번째 칸`}</small>
            </button>
          </li>
        })}
      </ul> : <p className="w01-picker-empty">검색 조건에 맞는 카메라가 없습니다.</p>}
      <p className="w01-picker-note">고른 카메라와 이 칸의 카메라가 자리를 바꿉니다.</p>
    </div>
  </dialog>
}
