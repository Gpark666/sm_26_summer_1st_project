import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# ====
# 1. 커스텀 예외 클래스 정의 (units/exceptions.py)
# ====

class CustomBaseException(Exception):
    """모든 커스텀 에러의 기본 클래스"""
    def __init__(self, status_code: int, error_code: str, message: str):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message


# ==== [1] 유저 인증 관련 에러 ====
class InvalidTokenException(CustomBaseException):
    def __init__(self, message="토큰이 유효하지 않거나 만료되었습니다."):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED", message)

class InvalidCredentialsException(CustomBaseException):
    def __init__(self, message="아이디 또는 비밀번호가 올바르지 않습니다."):
        super().__init__(status.HTTP_400_BAD_REQUEST, "INVALID_CREDENTIALS", message)


# ==== [2] 영상 수신 및 프론트 전달 관련 에러 ====
class CameraNotFoundException(CustomBaseException):
    def __init__(self, message="카메라 장치를 찾을 수 없거나 연결되어 있지 않습니다."):
        super().__init__(status.HTTP_503_SERVICE_UNAVAILABLE, "CAMERA_NOT_FOUND", message)

class VideoReadException(CustomBaseException):
    def __init__(self, message="카메라 프레임을 읽어오는 데 실패했습니다."):
        super().__init__(status.HTTP_500_INTERNAL_SERVER_ERROR, "VIDEO_READ_ERROR", message)

class StreamDisconnectedException(CustomBaseException):
    def __init__(self, message="프론트엔드와의 영상 스트리밍 연결이 중단되었습니다."):
        super().__init__(status.HTTP_503_SERVICE_UNAVAILABLE, "STREAM_DISCONNECTED", message)


# ==== [3] 시스템 및 DB 연결 오류 ====
class DatabaseConnectionException(CustomBaseException):
    def __init__(self, message="데이터베이스 연결에 실패했습니다."):
        super().__init__(status.HTTP_500_INTERNAL_SERVER_ERROR, "DB_CONNECTION_ERROR", message)


# ====
# 2. 공통 에러 핸들러 등록 함수 (units/handlers.py)
# ====

def register_exception_handlers(app: FastAPI):
    
    # 우리가 정의한 커스텀 에러 공통 처리 (요구사항 포맷 반영)
    @app.exception_handler(CustomBaseException)
    async def custom_exception_handler(request: Request, exc: CustomBaseException):
        # 프론트엔드에는 일관된 JSON을 보내고, CMD에는 상태 변경을 기록합니다.
        logger.warning(
            "요청 처리 실패: method=%s path=%s status=%s error_code=%s message=%s",
            request.method,
            request.url.path,
            exc.status_code,
            exc.error_code,
            exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": exc.status_code,
                "error_code": exc.error_code,
                "message": exc.message,
            }
        )

    # 예상치 못한 시스템 500 에러 처리
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "처리되지 않은 서버 오류: method=%s path=%s",
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": 500,
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "서버 내부에서 알 수 없는 연결 오류가 발생했습니다.",
            }
        )