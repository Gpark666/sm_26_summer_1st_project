import { NavLink } from 'react-router'

export default function MobileNav() {
  return (
    <nav className="w04-mobile-nav" aria-label="화면 선택">
      <NavLink to="/live">라이브 관제</NavLink>
      <NavLink to="/cameras">카메라 목록</NavLink>
      <NavLink to="/settings">관제 설정</NavLink>
    </nav>
  )
}
