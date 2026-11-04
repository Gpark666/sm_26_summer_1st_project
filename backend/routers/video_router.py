from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from aiortc import RTCSessionDescription

from backend.services.video_services import CameraType, video_service
from backend.services.auth_services import verify_access_token
from backend.units.error_handler import InvalidTokenException

#라우터 등록 및 태그 지정
router = APIRouter(prefix="/video", tags=["video"])
bearer_scheme = HTTPBearer(auto_error=False)


class WebRTCOffer(BaseModel):
    sdp: str = Field(min_length=1)
    type: Literal["offer"]


class WebRTCAnswer(BaseModel):
    sdp: str
    type: str


@router.post("/offer", response_model=WebRTCAnswer)
async def create_video_answer(
    offer: WebRTCOffer,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    camera_type: CameraType = Query(
        default="webrtc",
        description="local: 서버 USB 웹캠, network: RTSP/HTTP 카메라, webrtc: 브라우저/휴대폰 카메라",
    ),
    camera_index: int = Query(default=0, ge=0),
    camera_url: str | None = Query(default=None),
) -> WebRTCAnswer:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise InvalidTokenException()

    verify_access_token(credentials.credentials)

    remote_offer = RTCSessionDescription(
        sdp=offer.sdp,
        type=offer.type,
    )

    answer = await video_service.create_answer(
        remote_offer,
        camera_type=camera_type,
        camera_index=camera_index,
        camera_url=camera_url,
    )

    return WebRTCAnswer(
        sdp=answer.sdp,
        type=answer.type,
    )