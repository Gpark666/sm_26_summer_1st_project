import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import CameraListPage from '../../camera-list/CameraListPage'
import CameraAddPage from '../../camera-list/CameraAddPage'
import CameraZoomPage from '../../camera-zoom/CameraZoomPage'
import LiveMonitoringPage from '../../live-monitoring/LiveMonitoringPage'
import MonitoringSettingsPage from '../../monitoring-settings/MonitoringSettingsPage'
import type { CameraSource } from '../../camera-list/cameraApi'
import type { CameraAddGateway } from '../../camera-list/cameraAdd'
import type { Preferences } from '../../monitoring-settings/settings'

type Props = {
  source: CameraSource
  cameraAddGateway: CameraAddGateway
  preferences: { value: Preferences; notice: string }
  applySettings: (value: Preferences) => void
}

// 관제 설정이 해시(#settings, #cameras)로 화면을 바꾸던 때의 링크를 새 경로로 보낸다.
const legacyPaths: Record<string, string> = { '#settings': '/settings', '#cameras': '/cameras' }

export default function AppRoutes({ source, cameraAddGateway, preferences, applySettings }: Props) {
  const navigate = useNavigate()
  const { hash, search } = useLocation()
  return (
    <Routes>
      <Route path="/live" element={<LiveMonitoringPage source={source} preferred={preferences.value} />} />
      <Route path="/live/:cameraId" element={<CameraZoomPage source={source} />} />
      <Route path="/cameras" element={<CameraListPage source={source}
        onOpenLive={camera => navigate('/live/' + encodeURIComponent(camera.cameraId))}
        onAddCamera={() => navigate('/cameras/new')} />} />
      <Route path="/cameras/new" element={<CameraAddPage gateway={cameraAddGateway}
        onCancel={() => navigate('/cameras')} onSaved={() => navigate('/cameras')} />} />
      <Route path="/settings" element={<MonitoringSettingsPage saved={preferences.value} source={source}
        initialNotice={preferences.notice} onSave={applySettings} />} />
      <Route path="*" element={<Navigate to={{ pathname: legacyPaths[hash] ?? '/live', search }} replace />} />
    </Routes>
  )
}
