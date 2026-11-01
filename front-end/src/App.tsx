import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'
import CameraListPage from '../camera-list/CameraListPage'
import CameraZoomPage from '../camera-zoom/CameraZoomPage'
import { demoSource, realSource } from '../camera-list/cameraApi'
import LiveMonitoringPage from '../live-monitoring/LiveMonitoringPage'
import Sidebar from '../shared/Sidebar'

// 개발용 예시는 개발 서버에서만 허용한다. 배포 빌드는 항상 실제 API를 사용한다.
const demo = import.meta.env.DEV && import.meta.env.VITE_CAMERA_MODE !== 'api'
const source = demo
  ? demoSource(new URLSearchParams(window.location.search).get('scenario') ?? '')
  : realSource(import.meta.env.VITE_CAMERA_API_BASE || '/api/v1')

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  return <div className={'w03-shell' + (collapsed ? ' collapsed' : '')}>
    <Routes>
      <Route path="/live" element={<LiveMonitoringPage source={source} />} />
      <Route path="/live/:cameraId" element={<CameraZoomPage source={source} />} />
      <Route path="/cameras" element={<CameraListPage source={source}
        onOpenLive={camera => navigate('/live/' + encodeURIComponent(camera.cameraId))} />} />
      <Route path="*" element={<Navigate to="/live" replace />} />
    </Routes>
    <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
  </div>
}
