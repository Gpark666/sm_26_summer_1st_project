const server = 'http://127.0.0.1:8000'
export type Row = { id: string; name: string; type: string }

export class ServerError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api(path: string, init: RequestInit) {
  const response = await fetch(server + path, { ...init, cache: 'no-store', redirect: 'error' })
  if (response.status === 204) return null
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ServerError(response.status, body?.message || '서버 요청 실패 (' + response.status + ')')
  }
  return response.json()
}

export async function login(username: string, password: string, signal: AbortSignal): Promise<string> {
  const body = await api('/auth/token', { method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
  if (!body?.access_token) throw new Error('로그인 토큰을 받지 못했습니다.')
  return body.access_token
}

export async function receiveVideo(id: string, token: string, video: HTMLVideoElement,
  signal: AbortSignal, onFrame: () => void, onError: (message: string) => void) {
  signal.throwIfAborted()
  let peer: RTCPeerConnection | undefined
  signal.addEventListener('abort', () => {
    video.onloadeddata = null
    if (peer) {
      peer.ontrack = null
      peer.onconnectionstatechange = null
      peer.close()
    }
    video.srcObject = null
  }, { once: true })
  const pc = new RTCPeerConnection({ iceServers: [] })
  signal.throwIfAborted()
  peer = pc
  pc.addTransceiver('video', { direction: 'recvonly' })
  video.onloadeddata = () => {
    if (signal.aborted || !video.videoWidth) return
    onFrame()
  }
  pc.ontrack = event => { video.srcObject = new MediaStream([event.track]) }
  pc.onconnectionstatechange = () => {
    if (['failed','disconnected'].includes(pc.connectionState)) onError('영상 연결이 끊어졌습니다. 다시 연결하세요.')
  }
  await pc.setLocalDescription(await pc.createOffer())
  while (pc.iceGatheringState !== 'complete') {
    signal.throwIfAborted()
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  const answer = await api('/video/offer?camera_id=' + encodeURIComponent(id), {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(pc.localDescription),
  })
  signal.throwIfAborted()
  await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp })
}
