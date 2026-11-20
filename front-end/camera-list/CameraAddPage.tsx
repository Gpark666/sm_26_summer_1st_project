import { useEffect, useRef, useState } from 'react'
import { initialDraft, validateDraft, type CameraAddGateway, type CameraDraft, type DemoScenario, type DraftErrors, type TestReceipt } from './cameraAdd'
import CameraFormField from '../src/components/CameraFormField'
import cameraIcon from '../shared/icons/camera.svg'
import './camera-add.css'
import RegisteredPreview from './RegisteredPreview'

type Props = { gateway: CameraAddGateway; onCancel: () => void; onSaved: () => void }
type Phase = 'idle' | 'testing' | 'tested' | 'saving' | 'failed'
function message(error: unknown) { return error instanceof Error ? error.message : '요청을 처리하지 못했습니다. 다시 시도해 주세요.' }

export default function CameraAddPage(props: Props) {
  const [preview, setPreview] = useState(false)
  if (preview) return <RegisteredPreview onBack={() => setPreview(false)} />
  return <CameraDraftPage {...props} onPreview={() => setPreview(true)} />
}

function CameraDraftPage({ gateway, onCancel, onSaved, onPreview }: Props & { onPreview: () => void }) {
  const [draft, setDraft] = useState<CameraDraft>({ ...initialDraft })
  const [errors, setErrors] = useState<DraftErrors>({})
  const [phase, setPhase] = useState<Phase>('idle')
  const [notice, setNotice] = useState('')
  const [scenario, setScenario] = useState<DemoScenario>('success')
  const [receipt, setReceipt] = useState<TestReceipt | null>(null)
  const currentReceipt = useRef<TestReceipt | null>(null)
  const request = useRef<AbortController | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const busy = phase === 'testing' || phase === 'saving'

  useEffect(() => () => {
    request.current?.abort()
    if (currentReceipt.current) gateway.release(currentReceipt.current)
  }, [gateway])
  useEffect(() => {
    if (!receipt) return
    const timer = setTimeout(() => {
      request.current?.abort()
      gateway.release(receipt)
      currentReceipt.current = null
      setReceipt(null); setPhase('idle'); setNotice('테스트 결과가 만료되었습니다. 연결 테스트를 다시 진행해 주세요.')
    }, Math.max(0, receipt.expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [receipt, gateway])

  function invalidate() {
    request.current?.abort()
    if (currentReceipt.current) gateway.release(currentReceipt.current)
    const hadResult = !!currentReceipt.current || phase === 'testing'
    currentReceipt.current = null; setReceipt(null); setPhase('idle')
    setNotice(hadResult ? '입력이 변경되었습니다. 연결 테스트를 다시 진행해 주세요.' : '')
  }
  function change<K extends keyof CameraDraft>(field: K, value: CameraDraft[K]) {
    invalidate(); setDraft(previous => ({ ...previous, [field]: value })); setErrors({})
  }
  function validated() {
    const result = validateDraft(draft)
    setErrors(result.errors)
    if (!result.payload) {
      setNotice('입력 항목을 확인해 주세요.')
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    }
    return result.payload
  }
  async function test() {
    if (request.current && !request.current.signal.aborted && busy) return
    invalidate()
    const payload = validated()
    if (!payload) return
    const controller = new AbortController(); request.current = controller
    setPhase('testing'); setNotice('')
    try {
      const next = await gateway.test(payload, scenario, controller.signal)
      if (controller.signal.aborted) { gateway.release(next); return }
      currentReceipt.current = next; setReceipt(next); setPhase('tested')
      setNotice(gateway.demo ? '시연 테스트가 완료되었습니다. 실제 장치에는 연결하지 않았습니다.' : '연결 테스트가 완료되었습니다.')
    } catch (error) {
      if (!controller.signal.aborted) { setPhase('failed'); setNotice(message(error)) }
    }
  }
  async function save() {
    if (!receipt || busy) return
    const payload = validated()
    if (!payload) return
    const controller = new AbortController(); request.current = controller
    setPhase('saving'); setNotice('')
    try {
      await gateway.save(payload, receipt, controller.signal)
      if (!controller.signal.aborted) onSaved()
    } catch (error) {
      if (!controller.signal.aborted) { setPhase('tested'); setNotice(message(error)) }
    }
  }
  function cancel() { invalidate(); onCancel() }
  const input = (field: keyof CameraDraft, placeholder = '', type = 'text') => <input
    id={'w10-' + field} type={type} value={String(draft[field])} placeholder={placeholder}
    autoComplete={field === 'password' ? 'new-password' : 'off'}
    maxLength={field === 'name' || field === 'location' ? 100 : field === 'memo' ? 500 : 2048}
    aria-invalid={!!errors[field]} aria-describedby={errors[field] ? 'w10-' + field + '-error' : undefined}
    onChange={event => change(field, event.target.value)} />
  const phaseText = { idle: '테스트 대기', testing: '테스트 중', tested: gateway.demo ? '시연 테스트 성공' : '연결 성공', saving: '저장 중', failed: '테스트 실패' }[phase]

  return <main className="w10">
    <header className="w10-head"><button type="button" onClick={cancel} disabled={phase === 'saving'} aria-label="카메라 목록으로 돌아가기">← 목록</button><h1>카메라 추가</h1><span>{gateway.demo ? '시연 모드' : '서버 연동 준비'}</span></header>
    <div className="w10-body">
      <button type="button" disabled={busy} onClick={onPreview}>등록된 카메라 실제 영상 보기</button>
      <p className="w10-breadcrumb">카메라 목록 / 카메라 추가</p>
      <p className="w10-intro">연결 정보를 입력하고 테스트 결과를 확인한 뒤 카메라를 저장하세요.</p>
      <div className="w10-banner">{gateway.demo
        ? '화면 동작을 확인하는 시연 모드입니다. 실제 카메라 연결과 서버 저장은 수행하지 않습니다.'
        : '현재 백엔드에는 저장 전 연결 테스트 API가 없습니다. API 연결 후 테스트와 저장을 사용할 수 있습니다.'}</div>
      {gateway.demo && <details className="w10-demo"><summary>시연 테스트 조건</summary>
        <label htmlFor="w10-scenario">확인할 상황</label><select id="w10-scenario" value={scenario} disabled={phase === 'saving'}
          onChange={event => { invalidate(); setScenario(event.target.value as DemoScenario) }}>
          <option value="success">테스트·저장 성공</option><option value="test-failure">연결 테스트 실패</option><option value="save-failure">저장 실패</option>
        </select><p>실제 장비 없이 성공·실패 화면과 재시도 동작을 점검합니다.</p>
      </details>}
      <form ref={form} noValidate onSubmit={event => { event.preventDefault(); void test() }}>
        <fieldset className="w10-fields" disabled={phase === 'saving'}><legend className="w10-sr">카메라 연결 정보</legend>
          <div className="w10-grid"><div className="w10-left">
            <section className="w10-card" aria-labelledby="w10-basic-title"><h2 id="w10-basic-title">기본 정보</h2>
              <div className="w10-columns">
                <CameraFormField name="name" label="카메라명 *" error={errors.name}>{input('name', '예: 정문 점자블록')}</CameraFormField>
                <CameraFormField name="location" label="설치 위치 *" error={errors.location}>{input('location', '예: 본관 1층 정문')}</CameraFormField>
              </div>
              <CameraFormField name="memo" label="메모 (선택)" error={errors.memo}>{input('memo', '설치 목적이나 참고 사항')}</CameraFormField>
            </section>
            <section className="w10-card" aria-labelledby="w10-connection-title"><h2 id="w10-connection-title">카메라 연결</h2>
              <CameraFormField name="kind" label="입력 방식"><select id="w10-kind" value={draft.kind} onChange={event => change('kind', event.target.value as CameraDraft['kind'])}>
                <option value="rtsp">RTSP 네트워크 카메라</option><option value="usb">백엔드 PC의 USB 카메라</option>
              </select></CameraFormField>
              {draft.kind === 'rtsp' ? <>
                <div className="w10-switch" role="group" aria-label="주소 입력 방식">
                  <button type="button" aria-pressed={draft.addressMode === 'parts'} onClick={() => change('addressMode', 'parts')}>나눠서 입력</button>
                  <button type="button" aria-pressed={draft.addressMode === 'url'} onClick={() => change('addressMode', 'url')}>전체 주소 입력</button>
                </div>
                {draft.addressMode === 'parts' ? <>
                  <div className="w10-address">
                    <CameraFormField name="host" label="IP 주소 또는 호스트 *" error={errors.host}>{input('host', '192.168.0.20')}</CameraFormField>
                    <CameraFormField name="port" label="포트 *" error={errors.port}>{input('port', '554')}</CameraFormField>
                  </div>
                  <CameraFormField name="path" label="스트림 경로" error={errors.path}>{input('path', '/stream1')}</CameraFormField>
                </> : <CameraFormField name="url" label="RTSP 전체 주소 *" error={errors.url}>{input('url', 'rtsp://192.168.0.20:554/stream1')}</CameraFormField>}
                <p className="w10-hint">계정과 비밀번호는 주소에 넣지 말고 아래 인증란에 입력하세요.</p>
                <div className="w10-columns">
                  <CameraFormField name="username" label="장비 사용자명">{input('username', '장비 계정')}</CameraFormField>
                  <CameraFormField name="password" label="장비 비밀번호">{input('password', '', 'password')}</CameraFormField>
                </div>
                <CameraFormField name="transport" label="전송 방식"><select id="w10-transport" value={draft.transport} onChange={event => change('transport', event.target.value as CameraDraft['transport'])}>
                  <option value="tcp">TCP (기본)</option><option value="udp">UDP</option>
                </select></CameraFormField>
              </> : <>
                <CameraFormField name="cameraIndex" label="장치 번호 *" error={errors.cameraIndex}>{input('cameraIndex', '0')}</CameraFormField>
                <p className="w10-hint">백엔드가 실행되는 PC에 연결된 카메라입니다. 첫 번째 장치는 보통 0부터 확인합니다.</p>
              </>}
              <p className="w10-hint">영상 파일과 앱 PC 카메라의 WebRTC 전송은 다음 연동 단계에서 지원합니다.</p>
            </section>
            <section className="w10-card"><label className="w10-analysis" htmlFor="w10-analysis"><span><strong>영상 분석 사용</strong><small>분석 서버 연결 후 적용되는 설정입니다.</small></span>
              <input id="w10-analysis" type="checkbox" role="switch" checked={draft.analysis} onChange={event => change('analysis', event.target.checked)} />
            </label><p className="w10-hint">현재 시연에서는 분석을 실행하거나 이 설정을 서버에 저장하지 않습니다.</p></section>
          </div><div className="w10-right">
            <section className="w10-card" aria-labelledby="w10-test-title"><div className="w10-card-head"><h2 id="w10-test-title">연결 테스트</h2>
              <span className={'w10-status ' + phase} role="status">{phaseText}</span></div>
              <div className="w10-preview" aria-label="미리보기 상태"><img src={cameraIcon} width="48" height="48" alt="" />
                <strong>{phase === 'testing' ? '시연 테스트 처리 중…' : receipt ? '시연 테스트 완료' : '미리보기 대기'}</strong>
                <p>{gateway.demo ? '실제 영상은 API 연동 후 표시됩니다.' : '영상 연결 기능 준비 중'}</p>
              </div>
              <button className="w10-test" type="submit" disabled={busy || !gateway.demo}>{phase === 'testing' ? '테스트 중…' : '연결 테스트'}</button>
            </section>
            <section className="w10-card"><h2>영상 정보</h2><dl className="w10-metadata">
              {['해상도', '코덱', '프레임', '응답 시간'].map(label => <div key={label}><dt>{label}</dt><dd>—</dd></div>)}
            </dl><p className="w10-hint">실제 수신 결과가 없으므로 측정값을 표시하지 않습니다.</p></section>
          </div></div>
        </fieldset>
        {notice && <div className={'w10-notice ' + (phase === 'failed' ? 'failure' : '')} role={phase === 'failed' || Object.keys(errors).length ? 'alert' : 'status'}>{notice}</div>}
        <footer className="w10-footer"><p>{gateway.demo ? '저장 시 이 브라우저·앱의 예시 목록에만 추가됩니다. 연결 정보와 비밀번호는 저장하지 않습니다.' : '연결 테스트 성공 후 저장할 수 있습니다.'}</p>
          <div><button type="button" disabled={phase === 'saving'} onClick={cancel}>취소</button>
            <button type="button" className="w10-save" disabled={!receipt || busy || !gateway.demo} onClick={() => void save()}>{phase === 'saving' ? '저장 중…' : gateway.demo ? '예시 카메라 저장' : '저장'}</button></div>
        </footer>
      </form>
    </div>
  </main>
}
