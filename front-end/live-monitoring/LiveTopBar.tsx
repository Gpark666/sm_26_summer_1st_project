import autoFocusIcon from './icons/auto-focus.svg'
import nextIcon from './icons/page-next.svg'
import previousIcon from './icons/page-prev.svg'
import './live-monitoring.css'

type Props = {
  layout: string
  layoutOptions: [string, string][]
  onLayout: (value: string) => void
  locations: string[]
  location: string
  onLocation: (value: string) => void
  position: string
  // W01은 페이지, W02는 카메라 단위로 넘긴다. 없으면 버튼을 비활성화한다.
  unit: '페이지' | '카메라'
  onPrevious?: () => void
  onNext?: () => void
  // W02에서는 제목이 복귀 버튼이 된다.
  onBack?: () => void
}

export default function LiveTopBar(props: Props) {
  return <header className="w01-head">
    <h1>{props.onBack
      ? <button className="w01-back" title="더블클릭 또는 Esc로도 돌아갈 수 있어요" onClick={props.onBack}>‹ 라이브 관제</button>
      : '라이브 관제'}</h1>
    <div className="w01-actions">
      <div className="w01-filters">
        <select aria-label="화면 배치" value={props.layout} onChange={e => props.onLayout(e.target.value)}>
          {props.layoutOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="위치" value={props.location} onChange={e => props.onLocation(e.target.value)}>
          <option value="">전체 위치</option>{props.locations.map(item => <option key={item}>{item}</option>)}
        </select>
      </div>
      <nav className="w01-pages" aria-label={props.unit + ' 이동'}>
        <button aria-label={'이전 ' + props.unit} disabled={!props.onPrevious} onClick={props.onPrevious}>
          <img src={previousIcon} alt="" width={20} height={20} />
        </button>
        <span aria-live="polite">{props.position}</span>
        <button aria-label={'다음 ' + props.unit} disabled={!props.onNext} onClick={props.onNext}>
          <img src={nextIcon} alt="" width={20} height={20} />
        </button>
      </nav>
      <span className="w01-autofocus"><img src={autoFocusIcon} alt="" width={20} height={20} />자동 포커스 ON</span>
    </div>
  </header>
}
