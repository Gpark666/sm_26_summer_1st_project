from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.base import Base

class Camera(Base):
    """
    관제 카메라 장치 ORM 모델
    프론트엔드 카메라 인터페이스(cameraId, name, location, status, lastSeenAt)와 호환
    """
    __tablename__ = "cameras"

    camera_id = Column(String(64), primary_key=True, index=True, comment="카메라 식별자 (예: cam-01)")
    name = Column(String(100), nullable=False, comment="카메라 명칭 (예: 정문 점자블록)")
    location = Column(String(100), nullable=False, default="위치 미등록", index=True, comment="설치 위치 (예: 본관 1층)")
    status = Column(String(20), nullable=False, default="offline", index=True, comment="연결 상태 (online, offline)")
    stream_url = Column(String(255), nullable=True, comment="스트리밍 소스 URL (RTSP / WebRTC / 디바이스 인덱스)")
    last_seen_at = Column(DateTime(timezone=True), nullable=True, comment="마지막 연결 확인 시각")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # 연관된 탐지 이벤트 관계
    events = relationship("DetectionEvent", back_populates="camera", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Camera(camera_id='{self.camera_id}', name='{self.name}', status='{self.status}')>"
