from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from backend.services.auth_services import (
    authenticate_user,
    create_access_token,
    get_access_token_expire_seconds,
    verify_access_token,
)
from backend.units.error_handler import InvalidTokenException

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/session")
def check_session(credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False))):
    if credentials is None:
        raise InvalidTokenException()
    verify_access_token(credentials.credentials)
    return {"authenticated": True}


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    status: int = 200
    message: str = "인증이 완료되었습니다."
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/token", response_model=TokenResponse)
def issue_token(request: LoginRequest) -> TokenResponse:
    # 서비스에서 로그인 정보를 확인하고, 실패하면 공통 예외 응답을 반환합니다.
    subject = authenticate_user(request.username, request.password)
    return TokenResponse(
        access_token=create_access_token(subject),
        expires_in=get_access_token_expire_seconds(),
    )
