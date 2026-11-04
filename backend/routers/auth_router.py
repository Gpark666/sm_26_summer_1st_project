from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.services.auth_services import authenticate_user, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/token", response_model=TokenResponse)
def issue_token(request: LoginRequest) -> TokenResponse:
    subject = authenticate_user(request.username, request.password)
    return TokenResponse(access_token=create_access_token(subject))
