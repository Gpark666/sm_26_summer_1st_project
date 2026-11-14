import { useEffect, useRef, useState } from 'react'
import MonitoringSettingsPage from '../monitoring-settings/MonitoringSettingsPage'
import { readPreferences, savePreferences, type Preferences } from '../monitoring-settings/settings'
import CameraListPage from '../camera-list/CameraListPage'
import { demoSource, realSource, type Camera } from '../camera-list/cameraApi'

// 개발용 예시는 개발 서버에서만 허용한다. 배포 빌드는 항상 실제 API를 사용한다.
const demo = import.meta.env.DEV && import.meta.env.VITE_CAMERA_MODE !== 'api'
const source = demo
  ? demoSource(new URLSearchParams(window.location.search).get('scenario') ?? '')
  : realSource(import.meta.env.VITE_CAMERA_API_BASE || '/api/v1')

// 인증 연결 후에는 실제 로그인 사용자 ID를 scope에 포함한다.
const scope = demo ? 'demo' : 'browser'
const currentPage = () => window.location.hash === '#settings' ? 'settings' : 'cameras'

export default function App() {
  const [selected, setSelected] = useState<Camera | null>(null)
  const [preferences, setPreferences] = useState(() => readPreferences(scope))
  const [collapsed, setCollapsed] = useState(preferences.value.sidebar === 'collapsed')
  const [page, setPage] = useState(currentPage)
  useEffect(() => {
    const navigate = () => setPage(currentPage())
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  function applySettings(value: Preferences) {
    savePreferences(scope, value)
    setPreferences({ value, notice: '' })
    setCollapsed(value.sidebar === 'collapsed')
  }
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [selected])

  return <div className={'w03-shell' + (collapsed ? ' collapsed' : '')}>
    <nav className="w04-mobile-nav" aria-label="화면 선택">
      <a href="#cameras" aria-current={page === 'cameras' ? 'page' : undefined}>카메라 목록</a>
      <a href="#settings" aria-current={page === 'settings' ? 'page' : undefined}>관제 설정</a>
    </nav>
    {page === 'settings'
      ? <MonitoringSettingsPage saved={preferences.value} source={source} initialNotice={preferences.notice} onSave={applySettings} />
      : <CameraListPage source={source} onOpenLive={(camera) => setSelected(camera)} />}
    <aside className="w03-side" aria-label="관제 메뉴">
      <button className="w03-toggle" aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '‹' : '›'}</button>
      {!collapsed && <nav aria-label="메인 메뉴">
        <p>관제</p>
        <button disabled>라이브 관제</button>
        <a href="#cameras" aria-current={page === 'cameras' ? 'page' : undefined}>카메라 목록</a>
        <a href="#settings" aria-current={page === 'settings' ? 'page' : undefined}>관제 설정</a>
        <p>운영</p><button disabled>이벤트 히스토리</button><button disabled>감시 구역 설정</button>
      </nav>}
    </aside>
    <dialog className="w03-dialog" ref={dialog} aria-labelledby="w03-live-title" onClose={() => setSelected(null)}>
      <h2 id="w03-live-title">실시간 영상 보기</h2>
      <p>{selected?.name} · {selected?.cameraId}</p>
      <p>{demo ? '예시 데이터로 카메라 선택을 확인했습니다.' : '재생 세션을 요청했습니다.'} W02 영상 화면 연결 전입니다.</p>
      <form method="dialog"><button>목록으로 돌아가기</button></form>
    </dialog>
  </div>
}
