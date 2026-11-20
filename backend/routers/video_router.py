import logging
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from aiortc import RTCSessionDescription

from backend.services.video_services import (
    CameraType,
    camera_repository,
    video_service,
)
#from backend.services.camera_repository import camera_repository
#^ 위 코드 video_services.py에 임시로 작성한 카메라 관련 내용 주석에 있는 레포지토리 코드로 대체
from backend.units.error_handler import (
    CameraNotFoundException,
    InvalidCameraRequestException,
    InvalidTokenException,
)
from backend.services.auth_services import verify_access_token
from backend.units.error_handler import InvalidTokenException

#라우터 등록 및 태그 지정
router = APIRouter(prefix="/video", tags=["video"])
bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)

class CameraCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: Literal["local", "network"]
    camera_index: int | None = Field(default=None, ge=0)
    camera_url: str | None = Field(default=None, min_length=1)


class WebRTCOffer(BaseModel):
    sdp: str = Field(min_length=1)
    type: Literal["offer"]


class WebRTCAnswer(BaseModel):
    status: int = 200
    message: str = "영상 연결 인증 및 협상이 완료되었습니다."
    sdp: str
    type: str

#카메라 상태 
@router.post("/cameras", status_code=201)
async def register_camera(request: CameraCreateRequest):
    try:
        validate_camera_request(request)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc

    camera = camera_repository.create(
        name=request.name,
        camera_type=request.type,
        camera_index=request.camera_index,
        camera_url=request.camera_url,
    )

    return {
        "status": 201,
        "message": "카메라가 등록되었습니다.",
        "camera": {
            "id": camera.id,
            "name": camera.name,
            "type": camera.type,
        },
    }

#카메라 라우터 겟 
@router.get("/cameras")
async def list_cameras():
    return {
        "cameras": [
            {
                "id": camera.id,
                "name": camera.name,
                "type": camera.type,
            }
            for camera in camera_repository.list()
        ]
    }

@router.delete("/cameras/{camera_id}", status_code=204)
async def remove_camera(camera_id: str, credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise InvalidTokenException()
    verify_access_token(credentials.credentials)
    if not camera_repository.remove(camera_id):
        raise CameraNotFoundException("등록된 카메라가 없습니다.")
    await video_service.close_camera(camera_id)

@router.post("/offer", response_model=WebRTCAnswer)
async def create_video_answer(
    offer: WebRTCOffer,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    camera_id: str = Query(..., description="등록된 카메라 ID"),
) -> WebRTCAnswer:
    # 영상 연결 전에 Bearer 토큰을 확인하여 인증된 사용자만 연결을 만들 수 있게 합니다.
    if credentials is None or credentials.scheme.lower() != "bearer":
        logger.warning("영상 연결 거부: Bearer 인증 정보 없음")
        raise InvalidTokenException()

    username = verify_access_token(credentials.credentials)
    logger.info(
    "영상 연결 인증 완료: username=%s, camera_id=%s",
    username,
    camera_id,
)

    remote_offer = RTCSessionDescription(
        sdp=offer.sdp,
        type=offer.type,
    )

    camera = camera_repository.get(camera_id)

    if camera is None:
        raise CameraNotFoundException("등록된 카메라가 없습니다.")

    answer = await video_service.create_answer(
        remote_offer,
        camera=camera,
    )
    logger.info("영상 연결 응답 생성 완료: username=%s, camera_type=%s", username, camera.type)

    return WebRTCAnswer(
        status=200,
        message="영상 연결 인증 및 협상이 완료되었습니다.",
        sdp=answer.sdp,
        type=answer.type,
    )
#등록 요청 검증 함수 / 카메라 종류 있는지 확인 / error 400,500 검증 차이를 두려고 작성
def validate_camera_request(request: CameraCreateRequest) -> None:
    if request.type == "local":
        if request.camera_index is None:
            raise InvalidCameraRequestException(
                "local 카메라는 camera_index가 필요합니다."
            )

        if request.camera_url is not None:
            raise InvalidCameraRequestException(
                "local 카메라는 camera_url을 사용할 수 없습니다."
            )

    elif request.type == "network":
        if not request.camera_url:
            raise InvalidCameraRequestException(
                "network 카메라는 camera_url이 필요합니다."
            )

        if request.camera_index is not None:
            raise InvalidCameraRequestException(
                "network 카메라는 camera_index를 사용할 수 없습니다."
            )
        