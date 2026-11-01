import { useEffect, useEffectEvent, useReducer, useState, type ReactNode } from 'react'
import type { Camera, CameraSource } from '../camera-list/cameraApi'
import { canRetry, failureMessage, nextState, startState } from './playerState'
import cameraIcon from './icons/camera.svg'
import errorIcon from './icons/error.svg'
import loadingIcon from './icons/loading.svg'
import offlineIcon from './icons/offline.svg'
import './video-player.css'

type Props = {
  camera: Camera
  source: CameraSource
  // 재생 중일 때 영상 위에 얹을 감지 오버레이 자리 (2차)
  children?: ReactNode
}
const clock = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
function time(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—'
  return clock.format(new Date(value))
}
const badges = { connecting: '연결 중', playing: '온라인', failed: '오류', offline: '오프라인' }

export default function VideoPlayer({ camera, source, children }: Props) {
  const [state, dispatch] = useReducer(nextState, camera.status, startState)
  // 재시도 횟수는 누른 카메라에만 적용한다. 카메라가 바뀌면 상태대로 다시 시작한다.
  const [retry, setRetry] = useState({ cameraId: '', count: 0 })
  const retried = retry.cameraId === camera.cameraId ? retry.count : 0
  const { cameraId, status } = camera

  // 목록 새로고침으로 객체만 바뀐 경우에는 다시 요청하지 않도록 ID·상태만 본다.
  const request = useEffectEvent((signal: AbortSignal) => source.playback(camera, signal))
  useEffect(() => {
    if (retried) dispatch({ type: 'retry' })
    else {
      dispatch({ type: 'start', status })
      if (status === 'offline') return
    }
    const controller = new AbortController()
    request(controller.signal).then(
      session => { if (!controller.signal.aborted) dispatch({ type: 'success', session }) },
      error => { if (!controller.signal.aborted) dispatch({ type: 'failure', message: failureMessage(error) }) })
    return () => controller.abort()
  }, [source, cameraId, status, retried])

  const again = () => setRetry(previous => ({ cameraId,
    count: previous.cameraId === cameraId ? previous.count + 1 : 1 }))
  const retryButton = canRetry(state) && <button className="vp-retry" onClick={again}>재시도</button>
  const lastSeen = '마지막 응답 ' + time(camera.lastSeenAt)

  return <section className={'vp ' + state.kind} aria-label={camera.name + ' 영상'}>
    {state.kind === 'playing' && <>
      <div className="vp-center"><img src={cameraIcon} alt="" width={48} height={48} /><span>재생 중</span></div>
      <div className="vp-overlay">{children}</div>
    </>}
    {state.kind !== 'offline' && <div className="vp-bottom">{lastSeen}</div>}
    {state.kind === 'connecting' && <div className="vp-cover" role="status">
      <img src={loadingIcon} alt="" width={32} height={32} /><strong>연결 중...</strong>
    </div>}
    {state.kind === 'offline' && <div className="vp-cover" role="status">
      <img src={offlineIcon} alt="" width={32} height={32} /><strong>연결 끊김</strong><p>{lastSeen}</p>{retryButton}
    </div>}
    {state.kind === 'failed' && <div className="vp-cover" role="status">
      <img src={errorIcon} alt="" width={32} height={32} /><strong>연결 실패</strong><p>{state.message}</p>{retryButton}
    </div>}
    <div className="vp-top">
      <span className="vp-name" title={camera.name}>{camera.name}</span>
      <span className="vp-badge">{badges[state.kind]}</span>
    </div>
  </section>
}
