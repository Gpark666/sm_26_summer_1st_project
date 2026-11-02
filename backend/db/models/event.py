from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.base import Base

class DetectionEvent(Base):
    """
    AI 객체 탐지 이벤트 ORM 모델
    AI Server(YOLO 추론)로부터 전달되는 탐지 메타데이터 저장
    """
    __tablename__ = "detection_events"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    camera_id = Column(String(64), ForeignKey("cameras.camera_id", ondelete="CASCADE"), nullable=False, index=True, comment="발생 카메라 식별자")
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True, comment="탐지 시점")
    class_name = Column(String(50), nullable=False, index=True, comment="탐지 클래스 (예: person, wheelchair, bicycle)")
    confidence = Column(Float, nullable=False, comment="탐지 신뢰도 (0.0 ~ 1.0)")
    bbox = Column(JSON, nullable=True, comment="바운딩 박스 좌표 (x, y, width, height)")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # 연관 카메라 관계
    camera = relationship("Camera", back_populates="events")

    def __repr__(self) -> str:
        return f"<DetectionEvent(id={self.id}, camera_id='{self.camera_id}', class_name='{self.class_name}', confidence={self.confidence:.2f})>"
