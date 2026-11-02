import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import type { Camera, CameraSource } from '../camera-list/cameraApi'
import VideoPlayer from '../shared/VideoPlayer'

type Props = {
  camera: Camera
  source: CameraSource
  onOpen: (camera: Camera) => void
  // 재배치 중이면 집은 타일(source)과 놓을 칸(target)을 표시한다.
  moving?: 'source' | 'target'
  onKeyDown: (event: KeyboardEvent<HTMLLIElement>) => void
  onBlur: () => void
  // 타일 어디든 끌어서 옮기고, 다른 타일을 놓을 수 있게 하는 드래그 속성
  dnd: HTMLAttributes<HTMLLIElement>
  // 상단 바 버튼 (이 칸에 볼 카메라 바꾸기)
  actions?: ReactNode
}

export default function LiveTile({ camera, source, onOpen, moving, onKeyDown, onBlur, dnd, actions }: Props) {
  // 재시도 버튼을 빠르게 두 번 눌러도 확대 화면으로 넘어가지 않게 한다.
  function doubleClick(event: MouseEvent<HTMLLIElement>) {
    if (!(event.target as HTMLElement).closest('button')) onOpen(camera)
  }
  return <li className={'w01-tile' + (moving ? ' is-' + moving : '')} tabIndex={0} data-camera-id={camera.cameraId}
    title="더블클릭하거나 Enter를 누르면 확대합니다. 끌거나 Space를 누르면 자리를 옮깁니다."
    onDoubleClick={doubleClick} onKeyDown={onKeyDown} onBlur={onBlur} {...dnd}>
    <VideoPlayer camera={camera} source={source} actions={actions} />
  </li>
}
