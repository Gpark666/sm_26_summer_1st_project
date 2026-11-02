import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import sessionmaker, Session

from backend.config.db_config import (
    DATABASE_URL,
    DB_POOL_SIZE,
    DB_MAX_OVERFLOW,
    DB_POOL_RECYCLE,
    DB_ECHO,
)
from backend.units.error_handler import DatabaseConnectionException

logger = logging.getLogger(__name__)

# Engine 생성 인자 구성 (SQLite와 MySQL 분기 처리)
engine_kwargs = {
    "echo": DB_ECHO,
}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # MySQL / PostgreSQL 커넥션 풀링 설정
    engine_kwargs["pool_size"] = DB_POOL_SIZE
    engine_kwargs["max_overflow"] = DB_MAX_OVERFLOW
    engine_kwargs["pool_recycle"] = DB_POOL_RECYCLE
    engine_kwargs["pool_pre_ping"] = True

try:
    engine = create_engine(DATABASE_URL, **engine_kwargs)
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise DatabaseConnectionException(f"데이터베이스 엔진 생성 실패: {str(e)}")

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입(Depends)용 DB 세션 제너레이터.
    요청 처리 중 예외 발생 시 rollback을 수행하며,
    DB 연결 이상 시 DatabaseConnectionException을 발생시킵니다.
    """
    db = SessionLocal()
    try:
        yield db
    except OperationalError as oe:
        db.rollback()
        logger.error(f"Database operational connection error: {oe}")
        raise DatabaseConnectionException("데이터베이스 통신 중 연결 오류가 발생했습니다.")
    except SQLAlchemyError as se:
        db.rollback()
        logger.error(f"Database transaction error: {se}")
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection() -> bool:
    """
    데이터베이스 연결 상태를 점검하는 헬스체크 함수.
    연결 실패 시 DatabaseConnectionException을 발생시킵니다.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise DatabaseConnectionException(f"데이터베이스 연결에 실패했습니다: {str(e)}")
