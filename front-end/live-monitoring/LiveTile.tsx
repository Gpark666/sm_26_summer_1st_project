import type { HTMLAttributes, KeyboardEvent, MouseEvent } from 'react'
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
  // 상단 바 드래그 손잡이와 놓기 영역
  handle: HTMLAttributes<HTMLDivElement>
  drop: Pick<HTMLAttributes<HTMLLIElement>, 'onDragOver' | 'onDrop'>
}

export default function LiveTile({ camera, source, onOpen, moving, onKeyDown, onBlur, handle, drop }: Props) {
  // 재시도 버튼을 빠르게 두 번 눌러도 확대 화면으로 넘어가지 않게 한다.
  function doubleClick(event: MouseEvent<HTMLLIElement>) {
    if (!(event.target as HTMLElement).closest('button')) onOpen(camera)
  }
  return <li className={'w01-tile' + (moving ? ' is-' + moving : '')} tabIndex={0} data-camera-id={camera.cameraId}
    title="더블클릭하거나 Enter를 누르면 확대합니다. Space를 누르거나 상단 바를 끌면 자리를 옮깁니다."
    onDoubleClick={doubleClick} onKeyDown={onKeyDown} onBlur={onBlur} {...drop}>
    <VideoPlayer camera={camera} source={source} handle={handle} />
  </li>
}
