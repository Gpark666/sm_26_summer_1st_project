import { createDemoCameraAddGateway, createUnavailableCameraAddGateway, withRegisteredDemoCameras } from '../camera-list/cameraAdd'
import { useState } from 'react'
import { demoSource, disconnectedSource, realSource, type CameraSource } from '../camera-list/cameraApi'
import ServerAccess from '../camera-list/ServerAccess'
import AppRoutes from './router/AppRoutes'
import MobileNav from './components/MobileNav'
import Sidebar from './components/Sidebar'
import { useMonitoringPreferences } from './hooks/useMonitoringPreferences'

const demo = import.meta.env.MODE === 'desktop-demo' || import.meta.env.VITE_CAMERA_MODE === 'demo'
const legacyApi = import.meta.env.VITE_CAMERA_MODE === 'api'
const initialSource = demo
  ? withRegisteredDemoCameras(demoSource(new URLSearchParams(window.location.search).get('scenario') ?? ''))
  : legacyApi ? realSource(import.meta.env.VITE_CAMERA_API_BASE || '/api/v1') : disconnectedSource

const cameraAddGateway = demo ? createDemoCameraAddGateway() : createUnavailableCameraAddGateway()

// 인증 연결 후에는 실제 로그인 사용자 ID를 scope에 포함한다.
const scope = demo ? 'demo' : 'browser'

export default function App() {
  const [source, setSource] = useState<CameraSource>(initialSource)
  const { preferences, collapsed, applySettings, toggleSidebar } = useMonitoringPreferences(scope)
  return <div className={'w03-shell' + (collapsed ? ' collapsed' : '')}>
    <MobileNav />
    <div style={{ minWidth: 0 }}>
      {!demo && !legacyApi && <ServerAccess change={setSource} />}
      <AppRoutes key={source.token ? 'connected' : 'initial'} source={source} cameraAddGateway={cameraAddGateway}
        preferences={preferences} applySettings={applySettings} />
    </div>
    <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
  </div>
}
