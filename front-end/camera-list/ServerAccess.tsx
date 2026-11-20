import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CameraSource } from './cameraApi'
import { disconnectedSource } from './cameraApi'
import { api, login, ServerError, type Row } from './serverVideo'

declare global {
  interface Window {
    cameraSession?: {
      read(): Promise<string | null>
      write(token: string): Promise<void>
      clear(): Promise<void>
    }
  }
}

function serverSource(token: string): CameraSource {
  return {
    demo: false, token,
    async list(signal) {
      const body = await api('/video/cameras', { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) })
      if (!Array.isArray(body?.cameras)) throw new Error('카메라 목록 형식을 확인하세요.')
      return body.cameras.map((row: Row) => ({
        cameraId: row.id, name: row.name, location: '위치 미등록',
        status: 'unknown', lastSeenAt: null,
      }))
    },
    async remove(id) {
      await api('/video/cameras/' + encodeURIComponent(id), {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(8000),
      })
    },
  }
}

type Phase = 'checking' | 'login' | 'ready' | 'error'

export default function ServerAccess({ change }: { change: (source: CameraSource) => void }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const memory = useRef<string | null>(null)
  const submission = useRef<AbortController | null>(null)
  useEffect(() => () => submission.current?.abort(), [])

  useEffect(() => {
    const controller = new AbortController()
    let timer: number
    let activeToken: string | null = null
    async function check() {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])
      try {
        const token = memory.current ?? await window.cameraSession?.read()
        signal.throwIfAborted()
        await api(token ? '/auth/session' : '/', {
          signal, headers: token ? { Authorization: 'Bearer ' + token } : {},
        })
        signal.throwIfAborted()
        if (!token) { setPhase('login'); return }
        memory.current = token
        if (activeToken !== token) {
          activeToken = token
          change(serverSource(token))
        }
        setPhase('ready')
        timer = window.setTimeout(() => void check(), 10000)
      } catch (error) {
        if (controller.signal.aborted) return
        change(disconnectedSource)
        if (error instanceof ServerError && error.status === 401) {
          memory.current = null
          try { await window.cameraSession?.clear() }
          catch {
            if (!controller.signal.aborted) {
              setMessage('보안 저장소를 확인해 주세요.')
              setPhase('error')
            }
            return
          }
          if (controller.signal.aborted) return
          setMessage('인증이 만료되었습니다. 다시 로그인해 주세요.')
          setPhase('login')
        } else {
          setMessage(error instanceof ServerError ? error.message :
            error instanceof TypeError || signal.aborted ? '서버에 연결할 수 없음' : '보안 저장소 또는 서버 응답을 확인해 주세요.')
          setPhase('error')
        }
      }
    }
    void check()
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [attempt, change])

  function retry() {
    setMessage('')
    setPhase('checking')
    setAttempt(value => value + 1)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submission.current) return
    const data = new FormData(event.currentTarget)
    const controller = new AbortController()
    submission.current = controller
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])
    setBusy(true)
    setMessage('')
    try {
      const token = await login(String(data.get('username')), String(data.get('password')), signal)
      signal.throwIfAborted()
      if (window.location.protocol === 'file:' && !window.cameraSession) throw new Error('보안 저장소를 열 수 없습니다.')
      await window.cameraSession?.write(token)
      controller.signal.throwIfAborted()
      memory.current = token
      retry()
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof ServerError && [400, 401, 403].includes(error.status)) {
        setMessage('사용자명과 비밀번호를 확인해 주세요.')
      } else {
        setMessage(error instanceof TypeError || signal.aborted ? '서버에 연결할 수 없음' :
          error instanceof ServerError ? error.message : '인증 정보를 처리할 수 없습니다. 보안 저장소를 확인해 주세요.')
        setPhase('error')
      }
    } finally {
      submission.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  async function logout() {
    setBusy(true)
    try {
      await window.cameraSession?.clear()
      memory.current = null
      change(disconnectedSource)
      retry()
    } catch {
      setMessage('보안 저장소에서 인증 정보를 지울 수 없습니다.')
    } finally {
      setBusy(false)
    }
  }
  return <section className="server-access" aria-label="서버 연결">
    {phase === 'ready' && <button disabled={busy} onClick={() => void logout()}>서버 관제 종료</button>}
    {phase === 'checking' && <span role="status">서버 연결 확인 중…</span>}
    {message && <span role="alert">{message} </span>}
    {phase === 'error' && <button onClick={retry}>재시도</button>}
    {phase === 'login' && <form onSubmit={submit}>
      <label>백엔드 사용자명 <input name="username" defaultValue="demo" required autoComplete="username" /></label>
      <label>비밀번호 <input name="password" type="password" required autoComplete="current-password" /></label>
      <button disabled={busy}>{busy ? '연결 중…' : '로그인'}</button>
    </form>}
  </section>
}
