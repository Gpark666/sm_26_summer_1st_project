import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from backend.db.base import Base
from backend.db.session import engine, SessionLocal
from backend.db.models import User, Camera, MonitoringPreference, DetectionEvent
from backend.db.repositories.camera_repository import CameraRepository
from backend.db.repositories.monitoring_repository import MonitoringRepository
from backend.db.repositories.user_repository import UserRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_db")


def create_tables():
    """모든 ORM 테이블 생성 (스키마 초기화)"""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")


def seed_initial_data(db: Session):
    """
    초기 개발 및 관제 시스템 동작에 필요한 기본 시드 데이터 주입
    - 기본 카메라 4대 (프론트엔드 demoSource 및 관제 대상)
    - 기본 모니터링 환경 설정
    - 기본 관리자 계정 (미존재 시)
    """
    camera_repo = CameraRepository(db)
    monitoring_repo = MonitoringRepository(db)
    user_repo = UserRepository(db)

    now = datetime.now(timezone.utc)

    # 1. 초기 카메라 시드 데이터 등록
    initial_cameras = [
        {
            "camera_id": "cam-01",
            "name": "정문 점자블록",
            "location": "본관 1층",
            "status": "online",
            "stream_url": "0",  # 로컬 웹캠 또는 0번 디바이스
            "last_seen_at": now - timedelta(seconds=1),
        },
        {
            "camera_id": "cam-02",
            "name": "1층 경사로",
            "location": "본관 1층",
            "status": "online",
            "stream_url": None,
            "last_seen_at": now - timedelta(seconds=5),
        },
        {
            "camera_id": "cam-03",
            "name": "동측 보행로",
            "location": "동측 외부",
            "status": "offline",
            "stream_url": None,
            "last_seen_at": now - timedelta(seconds=95),
        },
        {
            "camera_id": "cam-04",
            "name": "서측 출입구",
            "location": "서관 1층",
            "status": "offline",
            "stream_url": None,
            "last_seen_at": None,
        },
    ]

    for cam_info in initial_cameras:
        existing = camera_repo.get_by_id(cam_info["camera_id"])
        if not existing:
            cam = Camera(
                camera_id=cam_info["camera_id"],
                name=cam_info["name"],
                location=cam_info["location"],
                status=cam_info["status"],
                stream_url=cam_info["stream_url"],
                last_seen_at=cam_info["last_seen_at"],
            )
            db.add(cam)
            logger.info(f"Seeded camera: {cam_info['camera_id']} ({cam_info['name']})")

    # 2. 기본 관제 설정 등록 (scope='default')
    default_pref = monitoring_repo.get_by_scope("default")
    if not default_pref:
        pref = MonitoringPreference(
            scope="default",
            layout="2×2",
            location_filter="",
            sidebar="expanded",
            auto_focus=True,
            grid_cameras={
                "slot-0": "cam-01",
                "slot-1": "cam-02",
                "slot-2": "cam-03",
                "slot-3": "cam-04",
            },
        )
        db.add(pref)
        logger.info("Seeded default monitoring preference.")

    # 3. 기본 관리자 계정 생성 (테스트/초기 운영용)
    admin_user = user_repo.get_by_username("admin")
    if not admin_user:
        # 기본 비밀번호: admin123! (실제 운영 시 변경 필요)
        # sha256 or bcrypt dummy hash for placeholder if passlib is not yet configured
        default_hash = "$2b$12$e80yq9z8uXfM4q7rW2qjMe1rC7QZ9FqG5B4c9R5uM2o5wF7sB3u1O"
        user = User(
            username="admin",
            email="admin@accessguard.local",
            hashed_password=default_hash,
            full_name="시스템 관리자",
            role="admin",
            is_active=True,
        )
        db.add(user)
        logger.info("Seeded default admin user.")

    db.commit()
    logger.info("Initial data seeding completed successfully.")


def main():
    """DB 초기화 실행 엔트리포인트"""
    create_tables()
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
