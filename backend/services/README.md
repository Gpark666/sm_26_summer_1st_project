# services

서비스의 핵심 비즈니스 로직을 둡니다.

- 유스케이스와 도메인 규칙
- 여러 DB 작업 또는 외부 API 호출의 조합
- 트랜잭션 경계 관리
- worker로 보낼 작업 결정

서비스는 HTTP 프레임워크에 의존하지 않게 작성합니다. 라우터에서 받은 입력을 처리하고 필요한 DB 기능을 호출합니다.

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

! 현재 webrtc 방식은 백엔드가 영상을 수신해서 분석할 수 있도록 준비하는 코드입니다. 아직 수신한 영상을 다시 프론트엔드로 재송출하지는 않음!