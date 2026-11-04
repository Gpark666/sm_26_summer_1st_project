import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Literal, Set

import cv2
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.mediastreams import MediaStreamError
from av import VideoFrame

from backend.units.error_handler import (
    CameraNotFoundException,
    StreamDisconnectedException,
    VideoReadException,
)

CameraType = Literal["local", "network", "webrtc"]

# 카메라 종류에 따라 영상 프레임을 읽는 서비스입니다. 
# USB 웹캠, RTSP/HTTP 카메라, WebRTC 브라우저/휴대폰 카메라를 지원합니다.
class CameraSource(ABC):
    """카메라 종류와 관계없이 영상 프레임을 읽기 위한 공통 인터페이스입니다."""

    @abstractmethod
    async def read(self) -> VideoFrame:
        raise NotImplementedError

    @abstractmethod
    def close(self) -> None:
        raise NotImplementedError


class OpenCVCameraSource(CameraSource):
    def __init__(self, source: int | str):
        self.capture = cv2.VideoCapture(source)
        if not self.capture.isOpened():
            self.capture.release()
            raise CameraNotFoundException()

    async def read(self) -> VideoFrame:
        ret, frame = await asyncio.to_thread(self.capture.read)
        if not ret:
            raise VideoReadException()

        return VideoFrame.from_ndarray(frame, format="bgr24")

    def close(self) -> None:
        if self.capture.isOpened():
            self.capture.release()


class LocalCameraSource(OpenCVCameraSource):
    """서버에 연결된 USB 웹캠을 사용합니다."""

    def __init__(self, camera_index: int = 0):
        super().__init__(camera_index)


class NetworkCameraSource(OpenCVCameraSource):
    """RTSP 또는 HTTP 카메라 주소를 사용합니다."""

    def __init__(self, camera_url: str):
        super().__init__(camera_url)


class WebRTCSource(CameraSource):
    """브라우저 또는 휴대폰이 WebRTC로 보낸 카메라 트랙을 사용합니다."""

    def __init__(self, track: MediaStreamTrack):
        self.track = track

    async def read(self) -> VideoFrame:
        try:
            frame = await self.track.recv()
        except MediaStreamError as exc:
            raise StreamDisconnectedException() from exc

        if not isinstance(frame, VideoFrame):
            raise VideoReadException("수신한 WebRTC 트랙이 영상 트랙이 아닙니다.")

        return frame

    def close(self) -> None:
        self.track.stop()


class CameraVideoTrack(VideoStreamTrack):
    """CameraSource의 프레임을 WebRTC 송출 트랙으로 변환합니다."""

    def __init__(self, source: CameraSource):
        super().__init__()
        self.source = source

    async def recv(self) -> VideoFrame:
        pts, time_base = await self.next_timestamp()
        frame = await self.source.read()
        frame.pts = pts
        frame.time_base = time_base
        return frame

    def stop(self) -> None:
        self.source.close()
        super().stop()


class VideoService:
    def __init__(self):
        self.peer_connections: Set[RTCPeerConnection] = set()
        self.sources: Dict[RTCPeerConnection, CameraSource] = {}
        self.incoming_tasks: Set[asyncio.Task[None]] = set()

    async def create_answer(
        self,
        offer: RTCSessionDescription,
        camera_type: CameraType,
        camera_index: int = 0,
        camera_url: str | None = None,
    ) -> RTCSessionDescription:
        peer_connection = RTCPeerConnection()
        self.peer_connections.add(peer_connection)

        @peer_connection.on("track")
        def on_track(track: MediaStreamTrack) -> None:
            if camera_type != "webrtc" or track.kind != "video":
                track.stop()
                return

            source = WebRTCSource(track)
            self.sources[peer_connection] = source
            task = asyncio.create_task(self._consume_incoming_video(source))
            self.incoming_tasks.add(task)
            task.add_done_callback(self.incoming_tasks.discard)

        try:
            if camera_type == "local":
                source: CameraSource = LocalCameraSource(camera_index)
                self.sources[peer_connection] = source
                peer_connection.addTrack(CameraVideoTrack(source))
            elif camera_type == "network":
                if not camera_url:
                    raise CameraNotFoundException("네트워크 카메라 주소가 필요합니다.")
                source = NetworkCameraSource(camera_url)
                self.sources[peer_connection] = source
                peer_connection.addTrack(CameraVideoTrack(source))

            await peer_connection.setRemoteDescription(offer)
            answer = await peer_connection.createAnswer()
            await peer_connection.setLocalDescription(answer)

            if peer_connection.localDescription is None:
                raise StreamDisconnectedException()

            return peer_connection.localDescription
        except (CameraNotFoundException, VideoReadException, StreamDisconnectedException):
            await self.close_connection(peer_connection)
            raise
        except (RuntimeError, ValueError) as exc:
            await self.close_connection(peer_connection)
            raise StreamDisconnectedException() from exc

    async def _consume_incoming_video(self, source: WebRTCSource) -> None:
        try:
            while True:
                await source.read()
        except (StreamDisconnectedException, VideoReadException):
            source.close()

    async def close_connection(self, peer_connection: RTCPeerConnection) -> None:
        source = self.sources.pop(peer_connection, None)
        if source:
            source.close()

        self.peer_connections.discard(peer_connection)
        await peer_connection.close()

    async def close_all(self) -> None:
        for peer_connection in list(self.peer_connections):
            await self.close_connection(peer_connection)


video_service = VideoService()
