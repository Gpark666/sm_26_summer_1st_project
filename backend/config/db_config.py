import os
from pathlib import Path
from dotenv import load_dotenv

# .env 파일 로드 (backend/.env 또는 프로젝트 루트 .env)
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# 데이터베이스 연결 정보 설정
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "sm_accessguard")

# 명시적 DATABASE_URL이 없을 경우 MySQL 연결 문자열 생성, 비밀번호가 없으면 SQLite 기본 지원
DEFAULT_MYSQL_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if DB_PASSWORD:
        DATABASE_URL = DEFAULT_MYSQL_URL
    else:
        # 로컬 기본값으로 SQLite 사용 (개발 편의성)
        DATABASE_URL = "sqlite:///./app.db"

# 커넥션 풀 설정
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "20"))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))
DB_ECHO = os.getenv("DB_ECHO", "False").lower() in ("true", "1", "t")
