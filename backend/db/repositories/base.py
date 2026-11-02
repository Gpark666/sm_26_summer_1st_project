from typing import Any, Generic, List, Optional, Type, TypeVar
from sqlalchemy.orm import Session
from backend.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    """
    공통 CRUD 기능을 제공하는 기본 Repository 클래스
    """
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id_val: Any) -> Optional[ModelType]:
        """기본키로 단일 엔티티 조회"""
        return self.db.query(self.model).get(id_val)

    def list(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """목록 조회 (페이징)"""
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def create(self, obj: ModelType) -> ModelType:
        """엔티티 저장"""
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, db_obj: ModelType, update_data: dict) -> ModelType:
        """엔티티 수정"""
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id_val: Any) -> bool:
        """기본키로 엔티티 삭제"""
        obj = self.get(id_val)
        if obj:
            self.db.delete(obj)
            self.db.commit()
            return True
        return False
