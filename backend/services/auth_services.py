import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from backend.units.error_handler import InvalidCredentialsException, InvalidTokenException

JWT_ALGORITHM = "HS256"
JWT_SECRET_ENV = "JWT_SECRET_KEY"
JWT_EXPIRE_MINUTES_ENV = "JWT_EXPIRE_MINUTES"


def _get_jwt_secret() -> str:
    secret = os.getenv(JWT_SECRET_ENV)
    if not secret:
        raise RuntimeError(
            f"{JWT_SECRET_ENV} 환경 변수가 설정되지 않았습니다."
        )
    if len(secret) < 32:
        raise RuntimeError(f"{JWT_SECRET_ENV}는 32자 이상이어야 합니다.")
    return secret


def _get_expire_minutes() -> int:
    value = os.getenv(JWT_EXPIRE_MINUTES_ENV, "60")
    try:
        minutes = int(value)
    except ValueError as exc:
        raise RuntimeError(
            f"{JWT_EXPIRE_MINUTES_ENV}는 정수여야 합니다."
        ) from exc

    if minutes <= 0:
        raise RuntimeError(f"{JWT_EXPIRE_MINUTES_ENV}는 0보다 커야 합니다.")

    return minutes


def authenticate_user(username: str, password: str) -> str:
    """임시 인증 저장소입니다. 실제 DB 인증으로 교체할 지점입니다."""
    expected_username = os.getenv("AUTH_USERNAME")
    expected_password = os.getenv("AUTH_PASSWORD")

    if not expected_username or not expected_password:
        raise RuntimeError("AUTH_USERNAME과 AUTH_PASSWORD 환경 변수가 필요합니다.")

    if not (
        secrets.compare_digest(username, expected_username)
        and secrets.compare_digest(password, expected_password)
    ):
        raise InvalidCredentialsException()

    return username


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=_get_expire_minutes())
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def verify_access_token(token: str) -> str:
    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, RuntimeError) as exc:
        raise InvalidTokenException() from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise InvalidTokenException()

    return subject
