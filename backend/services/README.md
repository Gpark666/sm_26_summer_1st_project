# services

서비스의 핵심 비즈니스 로직을 둡니다.

- 유스케이스와 도메인 규칙
- 여러 DB 작업 또는 외부 API 호출의 조합
- 트랜잭션 경계 관리
- worker로 보낼 작업 결정

서비스는 HTTP 프레임워크에 의존하지 않게 작성합니다. 라우터에서 받은 입력을 처리하고 필요한 DB 기능을 호출합니다.

**하는일 정리본**
백엔드 수신 영상
├── 프론트엔드 재송출
└── AI 서버 전달 준비 지점

**카메라별 사용 방식 정리**
1. 서버 use 웹캠
/video/offer?camera_type=local&camera_index=0
서버 USB 카메라 → OpenCV → WebRTC → 프론트엔드

2. 네트워크 카메라
/video/offer?camera_type=network&camera_url=rtsp://카메라주소
RTSP/HTTP 카메라 → OpenCV → WebRTC → 프론트엔드

3. 휴대폰, 브라우저 캠
/video/offer?camera_type=webrtc
휴대폰 카메라 → 브라우저 WebRTC → 백엔드

**작동 방식**
1. 브라우저가 카메라 권한 요청
        ↓
2. getUserMedia()로 카메라 영상 획득
        ↓
3. RTCPeerConnection에 영상 추가
        ↓
4. SDP offer 생성
        ↓
5. 백엔드 /video/offer로 offer 전송
        ↓
6. 백엔드가 SDP answer 반환
        ↓
7. 브라우저가 answer 등록
        ↓
8. WebRTC 연결 완료

local 방식
서버 USB 웹캠
→ OpenCV
→ 백엔드 WebRTC
→ 프론트엔드

network방식
RTSP/HTTP 카메라
→ OpenCV
→ 백엔드 WebRTC
→ 프론트엔드

webrtc방식
휴대폰/브라우저 카메라
→ 프론트엔드 WebRTC
→ 백엔드
→ 같은 WebRTC 연결로 프론트엔드에 재전송
