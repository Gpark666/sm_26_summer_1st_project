import { NavLink } from 'react-router'
import './shell.css'

type Props = {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  return <aside className="w03-side" aria-label="관제 메뉴">
    <button className="w03-toggle" aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
      aria-expanded={!collapsed} onClick={onToggle}>{collapsed ? '‹' : '›'}</button>
    {!collapsed && <nav aria-label="메인 메뉴">
      <p>관제</p>
      <NavLink to="/live">라이브 관제</NavLink><NavLink to="/cameras">카메라 목록</NavLink>
      <button disabled>관제 설정</button>
      <p>운영</p><button disabled>이벤트 히스토리</button><button disabled>감시 구역 설정</button>
    </nav>}
  </aside>
}
