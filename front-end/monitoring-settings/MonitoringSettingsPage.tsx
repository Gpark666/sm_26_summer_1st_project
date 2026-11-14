import { useEffect, useState } from 'react'
import type { CameraSource } from '../camera-list/cameraApi'
import { defaults, layouts, samePreferences, validLocation, type Layout, type Preferences } from './settings'
import './monitoring-settings.css'

type Props = {
  saved: Preferences
  source: CameraSource
  initialNotice: string
  onSave: (value: Preferences) => void
}
type Locations = { state: 'loading' | 'error' | 'ready'; names: string[] }

export default function MonitoringSettingsPage({ saved, source, initialNotice, onSave }: Props) {
  const [draft, setDraft] = useState<Preferences>(() => ({ ...saved }))
  const [feedback, setFeedback] = useState(initialNotice)
  const [attempt, setAttempt] = useState(0)
  const [locations, setLocations] = useState<Locations>({ state: 'loading', names: [] })
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    source.list(signal, attempt).then(rows => {
      if (!signal.aborted) setLocations({ state: 'ready', names: [...new Set(rows.map(row => row.location))] })
    }).catch(() => {
      if (!signal.aborted) setLocations({ state: 'error', names: [] })
    })
    return () => controller.abort()
  }, [source, attempt])

  const location = locations.state === 'ready' ? validLocation(draft.location, locations.names) : draft.location
  const values = { ...draft, location }
  const dirty = !samePreferences(values, saved)
  function edit(change: Partial<Preferences>) {
    setDraft(current => ({ ...current, ...change }))
    setFeedback('')
  }
  function save() {
    try {
      onSave(values)
      setDraft(values)
      setFeedback('이 브라우저에 설정을 저장했습니다.')
    } catch {
      setFeedback('저장하지 못했습니다. 브라우저의 사이트 데이터 저장 설정을 확인하고 다시 시도하세요.')
    }
  }

  return <main className="w04">
    <header className="w04-header"><h1>관제 설정</h1><small>관제 환경</small></header>
    <form className="w04-content" onSubmit={event => { event.preventDefault(); save() }}>
      <p className="w04-intro">라이브 관제의 기본 화면과 자동 포커스 동작을 설정합니다.</p>
      <section aria-labelledby="w04-live">
        <div className="w04-section-head"><h2 id="w04-live">라이브 화면</h2><p>관제 화면에 처음 진입할 때 적용할 기본값입니다.</p></div>
        <div className="w04-row"><div><label htmlFor="w04-layout">기본 화면 구성</label><p id="layout-help">라이브 관제에서 사용할 영상 분할 배치를 선택합니다.</p></div>
          <select id="w04-layout" aria-describedby="layout-help" value={draft.layout} onChange={e => edit({ layout: e.target.value as Layout })}>
            {layouts.map(layout => <option key={layout}>{layout}</option>)}
          </select></div>
        <div className="w04-row"><div><label htmlFor="w04-location">기본 위치 필터</label>
          <p id="location-help">{locations.state === 'error' ? '위치를 조회하지 못했습니다. 다른 설정은 계속 편집할 수 있습니다.' :
              locations.state === 'loading' ? '카메라 위치를 조회하고 있습니다.' :
              location !== draft.location ? '이전 위치에 접근할 수 없어 전체 위치를 표시합니다.' :
              '라이브 관제에 표시할 카메라 위치를 선택합니다.'}</p></div>
          <div className="w04-location">
            {locations.state === 'error' && <button type="button" onClick={() => {
              setLocations({ state: 'loading', names: [] }); setAttempt(value => value + 1)
            }}>위치 재조회</button>}
            <select id="w04-location" aria-describedby="location-help" value={location} disabled={locations.state !== 'ready'} onChange={e => edit({ location: e.target.value })}>
              <option value="">전체 위치</option>
              {locations.state !== 'ready' && location && <option value={location}>{location}</option>}
              {locations.names.filter(Boolean).map(name => <option key={name}>{name}</option>)}
            </select></div></div>
        <div className="w04-row"><div><label htmlFor="w04-sidebar">사이드바 기본 상태</label><p>관제에 진입할 때 메뉴를 펼칠지 선택합니다.</p></div>
          <select id="w04-sidebar" value={draft.sidebar} onChange={e => edit({ sidebar: e.target.value === 'collapsed' ? 'collapsed' : 'expanded' })}>
            <option value="expanded">펼침</option><option value="collapsed">접힘</option>
          </select></div>
      </section>
      <section aria-labelledby="w04-focus">
        <div className="w04-section-head"><h2 id="w04-focus">자동 포커스</h2><p>주의가 필요한 카메라를 빠르게 확인할 수 있도록 표시합니다.</p></div>
        <div className="w04-row"><div><label id="focus-label" htmlFor="w04-switch">자동 포커스 사용</label><p>카메라 연결이 끊기거나 영상 재생에 실패하면 해당 타일을 강조합니다.</p></div>
          <button type="button" id="w04-switch" className="w04-switch" role="switch" aria-labelledby="focus-label" aria-checked={draft.autoFocus} onClick={() => edit({ autoFocus: !draft.autoFocus })}>
            <span className="w04-track" aria-hidden="true"/>{draft.autoFocus ? '자동 포커스 ON' : '자동 포커스 OFF'}
          </button></div>
        <div className="w04-row"><div><strong>포커스 대상 상태</strong><p>1차 관제에서 강조할 장비 및 영상 상태입니다.</p></div>
          <span className="w04-target">{draft.autoFocus ? '오프라인 · 영상 연결 오류' : '강조 사용 안 함'}</span></div>
      </section>
      <div className="w04-footer">
        <p role="status" aria-live="polite">{feedback || (dirty ? '저장하지 않은 변경 사항이 있습니다.' : '변경한 설정은 저장 후 적용됩니다.')}</p>
        <button type="button" onClick={() => {
          setDraft({ ...defaults })
          setFeedback(samePreferences(defaults, saved) ? '기본값으로 복원했습니다.' : '기본값을 불러왔습니다. 설정 저장을 누르면 적용됩니다.')
        }}>기본값 복원</button>
        <button type="submit" className="w04-save" disabled={!dirty && !initialNotice}>설정 저장</button>
      </div>
    </form>
  </main>
}
