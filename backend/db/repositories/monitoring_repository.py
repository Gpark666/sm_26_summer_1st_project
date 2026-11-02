from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from backend.db.models.monitoring import MonitoringPreference
from backend.db.repositories.base import BaseRepository

class MonitoringRepository(BaseRepository[MonitoringPreference]):
    def __init__(self, db: Session):
        super().__init__(MonitoringPreference, db)

    def get_by_scope(self, scope: str = "default") -> Optional[MonitoringPreference]:
        """지정된 범위(scope)의 관제 설정 조회"""
        return self.db.query(MonitoringPreference).filter(MonitoringPreference.scope == scope).first()

    def upsert_preferences(
        self,
        scope: str = "default",
        layout: Optional[str] = None,
        location_filter: Optional[str] = None,
        sidebar: Optional[str] = None,
        auto_focus: Optional[bool] = None,
        grid_cameras: Optional[Dict[str, Any]] = None,
    ) -> MonitoringPreference:
        """관제 설정 저장 (기존 설정이 존재하면 갱신, 없으면 생성)"""
        pref = self.get_by_scope(scope)
        if not pref:
            pref = MonitoringPreference(
                scope=scope,
                layout=layout or "2×2",
                location_filter=location_filter if location_filter is not None else "",
                sidebar=sidebar or "expanded",
                auto_focus=auto_focus if auto_focus is not None else True,
                grid_cameras=grid_cameras or {},
            )
            return self.create(pref)

        if layout is not None:
            pref.layout = layout
        if location_filter is not None:
            pref.location_filter = location_filter
        if sidebar is not None:
            pref.sidebar = sidebar
        if auto_focus is not None:
            pref.auto_focus = auto_focus
        if grid_cameras is not None:
            pref.grid_cameras = grid_cameras

        self.db.commit()
        self.db.refresh(pref)
        return pref
