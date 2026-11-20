import { useEffect, useRef, useState } from 'react'

import { api, login, receiveVideo, type Row } from './serverVideo'

export default function RegisteredPreview({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [id, setId] = useState('')
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('카메라 목록을 불러오는 중입니다.')
  const [active, setActive] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const player = useRef<HTMLVideoElement>(null)
  const session = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api('/video/cameras', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) }).then(body => {
      if (controller.signal.aborted) return
      if (!Array.isArray(body.cameras) || !body.cameras.every((c: Row) => c && typeof c.id === 'string' && typeof c.name === 'string')) throw new Error()
      setRows(body.cameras); setId(body.cameras[0]?.id ?? '')
      setStatus(body.cameras.length ? '카메라를 선택하고 백엔드 계정으로 연결하세요.' : '등록된 카메라가 없습니다.')
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('목록 조회 실패. 이 PC의 백엔드가 8000번 포트에서 실행 중인지 확인하세요.')
    })
    return () => { controller.abort(); session.current?.abort() }
  }, [refresh])

  async function connect() {
    if (session.current || !player.current) return
    const controller = new AbortController()
    const { signal } = controller
    const video = player.current
    session.current = controller
    function end(text: string) {
      if (signal.aborted) return
      controller.abort()
      setActive(false); setStatus(text)
    }
    const timeout = window.setTimeout(() => end('영상 수신 시간 초과. 장치 번호와 카메라 사용 권한을 확인하세요.'), 30000)
    signal.addEventListener('abort', () => {
      clearTimeout(timeout)
      session.current = null
    }, { once: true })
    try {
      setActive(true); setStatus('백엔드 로그인 중입니다.')
      const token = await login(username, password, signal)
      signal.throwIfAborted()
      setStatus('카메라에 연결하고 첫 영상을 기다립니다.')
      await receiveVideo(id, token, video, signal, () => {
        clearTimeout(timeout)
        setStatus('영상 수신 중 · ' + video.videoWidth + ' × ' + video.videoHeight)
      }, end)
    } catch (error) {
      end(error instanceof Error ? error.message : '영상 연결에 실패했습니다.')
    }
  }

  return <main className="w10"><header className="w10-head"><h1>등록된 카메라 실제 영상</h1></header>
    <div className="w10-body"><section className="w10-card">
      <p className="w10-hint">이 PC의 백엔드에 등록된 카메라를 선택하세요. 같은 이름의 카메라는 ID로 구분할 수 있습니다.</p>
      <form onSubmit={event => { event.preventDefault(); void connect() }}>
        <label className="w10-field">카메라<select value={id} disabled={active} onChange={event => setId(event.target.value)}>
          {rows.map(c => <option key={c.id} value={c.id}>{c.name} · {c.id}</option>)}</select></label>
        <div className="w10-columns"><label className="w10-field">백엔드 사용자명<input required disabled={active} autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label className="w10-field">백엔드 비밀번호<input required disabled={active} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label></div>
        <button disabled={active || !id}>영상 연결</button>{' '}
        <button type="button" disabled={!active} onClick={() => { session.current?.abort(); setActive(false); setStatus('연결을 종료했습니다.') }}>연결 종료</button>{' '}
        <button type="button" disabled={active} onClick={() => { setRows([]); setId(''); setStatus('목록 조회 중'); setRefresh(n => n + 1) }}>목록 새로고침</button>
      </form><p className="w10-notice" role="status">{status}</p>
      <video ref={player} autoPlay playsInline muted controls aria-label="등록된 카메라 실시간 영상" style={{ width:'100%', maxHeight:'55vh', background:'#090b0e' }} />
      <button type="button" onClick={onBack}>카메라 추가로 돌아가기</button>
    </section></div></main>
}
