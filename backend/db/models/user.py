from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from backend.db.base import Base

class User(Base):
    """
    사용자(인증 및 관제 작업자) ORM 모델
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False, comment="로그인 아이디")
    email = Column(String(100), unique=True, index=True, nullable=True, comment="이메일")
    hashed_password = Column(String(255), nullable=False, comment="암호화된 비밀번호")
    full_name = Column(String(50), nullable=True, comment="이름 또는 표시명")
    role = Column(String(20), default="operator", nullable=False, comment="권한 (admin, operator, viewer)")
    is_active = Column(Boolean, default=True, nullable=False, comment="계정 활성화 상태")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"
