from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from backend.db.models.camera import Camera
from backend.db.repositories.base import BaseRepository

class CameraRepository(BaseRepository[Camera]):
    def __init__(self, db: Session):
        super().__init__(Camera, db)

    def get_by_id(self, camera_id: str) -> Optional[Camera]:
        """카메라 식별자로 조회"""
        return self.db.query(Camera).filter(Camera.camera_id == camera_id).first()

    def list_cameras(
        self,
        location: Optional[str] = None,
        status: Optional[str] = None,
        query: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Camera]:
        """
        위치(location), 상태(status), 검색어(query) 조건으로 카메라 목록 필터링 조회
        """
        q = self.db.query(Camera)

        if location:
            q = q.filter(Camera.location == location)

        if status:
            q = q.filter(Camera.status == status)

        if query:
            search_pattern = f"%{query.strip()}%"
            q = q.filter(
                or_(
                    Camera.name.ilike(search_pattern),
                    Camera.location.ilike(search_pattern),
                    Camera.camera_id.ilike(search_pattern),
                )
            )

        return q.order_by(Camera.camera_id.asc()).offset(skip).limit(limit).all()

    def get_locations(self) -> List[str]:
        """등록된 모든 카메라의 고유 위치 목록 반환"""
        results = self.db.query(Camera.location).distinct().all()
        return [r[0] for r in results if r[0]]

    def create_camera(
        self,
        camera_id: str,
        name: str,
        location: str = "위치 미등록",
        status: str = "offline",
        stream_url: Optional[str] = None,
    ) -> Camera:
        """새 카메라 등록"""
        camera = Camera(
            camera_id=camera_id,
            name=name,
            location=location,
            status=status,
            stream_url=stream_url,
        )
        return self.create(camera)

    def update_status(self, camera_id: str, status: str, last_seen_at: Optional[datetime] = None) -> Optional[Camera]:
        """카메라 연결 상태(online/offline) 및 최근 확인 시각 갱신"""
        camera = self.get_by_id(camera_id)
        if not camera:
            return None

        camera.status = status
        if last_seen_at is not None:
            camera.last_seen_at = last_seen_at
        elif status == "online":
            camera.last_seen_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(camera)
        return camera
