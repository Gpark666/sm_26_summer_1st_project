import { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router'
import CameraListPage from '../camera-list/CameraListPage'
import CameraZoomPage from '../camera-zoom/CameraZoomPage'
import { demoSource, realSource } from '../camera-list/cameraApi'
import LiveMonitoringPage from '../live-monitoring/LiveMonitoringPage'
import MonitoringSettingsPage from '../monitoring-settings/MonitoringSettingsPage'
import { readPreferences, savePreferences, type Preferences } from '../monitoring-settings/settings'
import Sidebar from '../shared/Sidebar'

// 데스크톱 시연 빌드에서는 백엔드 없이 예시 카메라를 표시한다.
const demo =
  import.meta.env.MODE === 'desktop-demo' ||
  (import.meta.env.DEV && import.meta.env.VITE_CAMERA_MODE !== 'api')
const source = demo
  ? demoSource(new URLSearchParams(window.location.search).get('scenario') ?? '')
  : realSource(import.meta.env.VITE_CAMERA_API_BASE || '/api/v1')

// 인증 연결 후에는 실제 로그인 사용자 ID를 scope에 포함한다.
const scope = demo ? 'demo' : 'browser'
// 관제 설정이 해시(#settings, #cameras)로 화면을 바꾸던 때의 링크를 새 경로로 보낸다.
const legacyPaths: Record<string, string> = { '#settings': '/settings', '#cameras': '/cameras' }

export default function App() {
  const [preferences, setPreferences] = useState(() => readPreferences(scope))
  const [collapsed, setCollapsed] = useState(preferences.value.sidebar === 'collapsed')
  const navigate = useNavigate()
  const { hash, search } = useLocation()
  function applySettings(value: Preferences) {
    savePreferences(scope, value)
    setPreferences({ value, notice: '' })
    setCollapsed(value.sidebar === 'collapsed')
  }

  return <div className={'w03-shell' + (collapsed ? ' collapsed' : '')}>
    <nav className="w04-mobile-nav" aria-label="화면 선택">
      <NavLink to="/live">라이브 관제</NavLink>
      <NavLink to="/cameras">카메라 목록</NavLink>
      <NavLink to="/settings">관제 설정</NavLink>
    </nav>
    <Routes>
      <Route path="/live" element={<LiveMonitoringPage source={source} preferred={preferences.value} />} />
      <Route path="/live/:cameraId" element={<CameraZoomPage source={source} />} />
      <Route path="/cameras" element={<CameraListPage source={source}
        onOpenLive={camera => navigate('/live/' + encodeURIComponent(camera.cameraId))} />} />
      <Route path="/settings" element={<MonitoringSettingsPage saved={preferences.value} source={source}
        initialNotice={preferences.notice} onSave={applySettings} />} />
      <Route path="*" element={<Navigate to={{ pathname: legacyPaths[hash] ?? '/live', search }} replace />} />
    </Routes>
    <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
  </div>
}
