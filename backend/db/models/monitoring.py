from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from backend.db.base import Base

class MonitoringPreference(Base):
    """
    관제 환경 설정(모니터링 레이아웃 및 뷰 옵션) ORM 모델
    프론트엔드 preferences(layout, location, sidebar, autoFocus) 및 칸 배치와 매핑
    """
    __tablename__ = "monitoring_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scope = Column(String(64), unique=True, nullable=False, default="default", index=True, comment="설정 범위/사용자 식별자")
    layout = Column(String(20), nullable=False, default="2×2", comment="그리드 레이아웃 (1×1, 2×2, 3×3, 1+5)")
    location_filter = Column(String(100), nullable=False, default="", comment="선택된 위치 필터")
    sidebar = Column(String(20), nullable=False, default="expanded", comment="사이드바 상태 (expanded, collapsed)")
    auto_focus = Column(Boolean, nullable=False, default=True, comment="이상 감지/오프라인 시 자동 포커스 여부")
    grid_cameras = Column(JSON, nullable=True, comment="그리드 타일별 할당된 카메라 목록/배치 정보")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<MonitoringPreference(scope='{self.scope}', layout='{self.layout}', auto_focus={self.auto_focus})>"
