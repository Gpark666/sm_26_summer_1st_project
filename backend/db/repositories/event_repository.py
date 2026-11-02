from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from backend.db.models.event import DetectionEvent
from backend.db.repositories.base import BaseRepository

class EventRepository(BaseRepository[DetectionEvent]):
    def __init__(self, db: Session):
        super().__init__(DetectionEvent, db)

    def create_event(
        self,
        camera_id: str,
        timestamp: datetime,
        class_name: str,
        confidence: float,
        bbox: Optional[Dict[str, Any]] = None,
    ) -> DetectionEvent:
        """AI 탐지 이벤트 저장"""
        event = DetectionEvent(
            camera_id=camera_id,
            timestamp=timestamp,
            class_name=class_name,
            confidence=confidence,
            bbox=bbox or {},
        )
        return self.create(event)

    def list_events(
        self,
        camera_id: Optional[str] = None,
        class_name: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[DetectionEvent]:
        """필터 조건에 따른 탐지 이벤트 조회 (최신순)"""
        q = self.db.query(DetectionEvent)

        if camera_id:
            q = q.filter(DetectionEvent.camera_id == camera_id)
        if class_name:
            q = q.filter(DetectionEvent.class_name == class_name)
        if start_time:
            q = q.filter(DetectionEvent.timestamp >= start_time)
        if end_time:
            q = q.filter(DetectionEvent.timestamp <= end_time)

        return q.order_by(DetectionEvent.timestamp.desc()).offset(skip).limit(limit).all()

    def get_latest_events(self, limit: int = 20) -> List[DetectionEvent]:
        """최근 발생한 이벤트 목록 조회"""
        return (
            self.db.query(DetectionEvent)
            .order_by(DetectionEvent.timestamp.desc())
            .limit(limit)
            .all()
        )
