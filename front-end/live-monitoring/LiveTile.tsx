import type { MouseEvent } from 'react'
import type { Camera, CameraSource } from '../camera-list/cameraApi'
import VideoPlayer from '../shared/VideoPlayer'

type Props = {
  camera: Camera
  source: CameraSource
  onOpen: (camera: Camera) => void
}

export default function LiveTile({ camera, source, onOpen }: Props) {
  // 재시도 버튼을 빠르게 두 번 눌러도 확대 화면으로 넘어가지 않게 한다.
  function doubleClick(event: MouseEvent<HTMLLIElement>) {
    if (!(event.target as HTMLElement).closest('button')) onOpen(camera)
  }
  return <li className="w01-tile" tabIndex={0} title="더블클릭하거나 Enter를 누르면 확대합니다"
    onDoubleClick={doubleClick}
    onKeyDown={event => { if (event.key === 'Enter' && event.target === event.currentTarget) onOpen(camera) }}>
    <VideoPlayer camera={camera} source={source} />
  </li>
}
