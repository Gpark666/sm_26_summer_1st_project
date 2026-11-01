import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'
import CameraListPage from '../camera-list/CameraListPage'
import { demoSource, realSource } from '../camera-list/cameraApi'
import Sidebar from '../shared/Sidebar'

// 개발용 예시는 개발 서버에서만 허용한다. 배포 빌드는 항상 실제 API를 사용한다.
const demo = import.meta.env.DEV && import.meta.env.VITE_CAMERA_MODE !== 'api'
const source = demo
  ? demoSource(new URLSearchParams(window.location.search).get('scenario') ?? '')
  : realSource(import.meta.env.VITE_CAMERA_API_BASE || '/api/v1')

// W01·W02 화면이 들어오기 전까지 경로만 잡아 둔다.
function Pending({ title }: { title: string }) {
  return <main className="w03">
    <header className="w03-head"><h1>{title}</h1></header>
    <p className="w03-body">화면 준비 중입니다.</p>
  </main>
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  return <div className={'w03-shell' + (collapsed ? ' collapsed' : '')}>
    <Routes>
      <Route path="/live" element={<Pending title="라이브 관제" />} />
      <Route path="/live/:cameraId" element={<Pending title="카메라 영상 확대" />} />
      <Route path="/cameras" element={<CameraListPage source={source}
        onOpenLive={camera => navigate('/live/' + encodeURIComponent(camera.cameraId))} />} />
      <Route path="*" element={<Navigate to="/live" replace />} />
    </Routes>
    <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
  </div>
}
