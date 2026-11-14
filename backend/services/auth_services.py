import os
import secrets
import logging
from datetime import datetime, timedelta, timezone

import jwt

from backend.units.error_handler import InvalidCredentialsException, InvalidTokenException

JWT_ALGORITHM = "HS256"
JWT_SECRET_ENV = "JWT_SECRET_KEY"
JWT_EXPIRE_MINUTES_ENV = "JWT_EXPIRE_MINUTES"
logger = logging.getLogger(__name__)


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
    """현재는 환경 변수로 사용자를 확인하며, 추후 DB 인증으로 교체합니다."""
    expected_username = os.getenv("AUTH_USERNAME")
    expected_password = os.getenv("AUTH_PASSWORD")

    if not expected_username or not expected_password:
        raise RuntimeError("AUTH_USERNAME과 AUTH_PASSWORD 환경 변수가 필요합니다.")

    if not (
        secrets.compare_digest(username, expected_username)
        and secrets.compare_digest(password, expected_password)
    ):
        logger.warning("로그인 실패: username=%s, 사유=자격 증명 불일치", username)
        raise InvalidCredentialsException()

    logger.info("로그인 성공: username=%s", username)
    return username


def get_access_token_expire_seconds() -> int:
    """프론트엔드가 만료 시점을 계산할 수 있도록 토큰 유효 시간을 초 단위로 반환합니다."""
    return _get_expire_minutes() * 60


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=_get_expire_minutes())
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)
    logger.info("액세스 토큰 발급 완료: username=%s, 만료=%s", subject, expires_at.isoformat())
    return token


def verify_access_token(token: str) -> str:
    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        logger.warning("토큰 만료: %s", exc)
        raise InvalidTokenException("토큰이 만료되었습니다.") from exc
    except (jwt.InvalidTokenError, RuntimeError) as exc:
        logger.warning("토큰 검증 실패: %s", exc)
        raise InvalidTokenException() from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        logger.warning("토큰 검증 실패: subject 누락")
        raise InvalidTokenException()

    logger.info("토큰 검증 성공: username=%s", subject)
    return subject
