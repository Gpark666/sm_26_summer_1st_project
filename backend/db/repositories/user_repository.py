from typing import Optional
from sqlalchemy.orm import Session
from backend.db.models.user import User
from backend.db.repositories.base import BaseRepository

class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_username(self, username: str) -> Optional[User]:
        """사용자 아이디로 조회"""
        return self.db.query(User).filter(User.username == username).first()

    def get_by_email(self, email: str) -> Optional[User]:
        """이메일로 조회"""
        return self.db.query(User).filter(User.email == email).first()

    def create_user(
        self,
        username: str,
        hashed_password: str,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        role: str = "operator",
    ) -> User:
        """새 사용자 등록"""
        user = User(
            username=username,
            hashed_password=hashed_password,
            email=email,
            full_name=full_name,
            role=role,
            is_active=True,
        )
        return self.create(user)
