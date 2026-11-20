# W10 카메라 추가 — 화면 구현 1단계

기준: front-end 브랜치 b1d5eb0. 신규 코드는 camera-list/에 두고 기존 파일은 src/App.tsx의 경로·버튼·시연 목록 연결만 변경한다. backend/, Electron, 자동 업데이트, 패키지 의존성, 다른 브랜치는 변경하지 않는다.

## 실행

front-end/에서 `npm run dev` 또는 `npm run desktop:demo`를 실행하고 카메라 목록 → 카메라 추가로 진입한다. 개발 기본값과 desktop-demo는 시연 모드이다. VITE_CAMERA_MODE=api 개발 모드 또는 일반 production 빌드는 서버 연동 준비 상태로 테스트·저장을 비활성화한다. 테스트용 설정을 바꾼 뒤에는 개발 서버를 재시작한다.

## 구현 내용

- 카메라명·설치 위치(필수), 메모(선택), RTSP 분리/전체 주소, 장비 인증, TCP/UDP, 백엔드 PC USB 장치 번호, 분석 사용 입력.
- 전체 URL에 인증 정보를 넣으면 별도 인증 필드로 옮기도록 안내한다.
- 입력 검증, 테스트 대기/진행/성공/실패, 재시도, 테스트 후 입력 변경 시 결과 무효화, 5분 결과 만료.
- 취소·화면 이탈 시 진행 중인 시연 요청 취소, 중복 저장 방지, 저장 오류 시 입력 유지.
- 시연 저장 후 카메라 목록으로 복귀하고 추가한 예시를 표시. 목록 메타데이터만 localStorage의 cctv-accessibility-ai:w10:demo-cameras:v1에 저장한다. 주소·아이디·비밀번호·메모·분석 설정은 저장하지 않는다.
- 시연 조건에서 연결 실패와 저장 실패를 재현할 수 있다. 실제 미리보기와 측정값은 표시하지 않는다.

예시 목록은 같은 브라우저 origin 또는 Electron 저장소에서만 유지된다. 실제 서버의 등록 데이터가 아니며 앱과 브라우저 사이에 공유되지 않는다. 분석 스위치는 화면 입력일 뿐 AI 실행 기능이 아니다.

## 검증

```bash
node --test camera-list/*.test.mjs monitoring-settings/*.test.mjs live-monitoring/*.test.mjs camera-zoom/*.test.mjs shared/*.test.mjs
npm run build
npm run lint
```

수동 확인: 빈 입력 검사 → 정상 테스트 → 입력 변경 시 저장 비활성화 → 재테스트 → 예시 저장 → 목록 표시 → 새로고침 후 유지. 시연 조건에서 테스트 실패/저장 실패를 확인한다. USB 선택 시 RTSP 입력이 숨겨져야 한다. 작은 창에서 양식은 1열로 표시된다.

## 다음 API 연동 단계

CameraAddGateway.test/save/release는 화면과 연결 구현의 경계이다. 현재 서버 구현은 미연결 상태를 명시적으로 반환하며 존재하지 않는 엔드포인트를 호출하지 않는다. 다음 단계에서 실제 gateway를 추가해야 한다.

1. 기존 POST /auth/token으로 JWT 발급 후 영상 요청에 Bearer 토큰 전달. 장비 계정과 앱 로그인 계정을 구분한다.
2. 저장 전 임시 테스트 API와 테스트 영상용 WebRTC 협상을 구현한다. 테스트 결과의 만료·입력 일치·사용자 일치는 서버에서도 검증한다. 종료 시 실제 연결/카메라 자원을 해제한다.
3. 기존 POST /video/cameras를 위치·메모·분석 사용·RTSP 전송 방식까지 저장하도록 확장하고 DB 영구 저장을 추가한다. 현재 저장소는 메모리뿐이다.
4. GET /video/cameras 응답을 기존 CameraSource 형식과 맞추되 실시간 상태를 임의로 online으로 채우지 않는다.
5. W10 미리보기에서 실제 영상 수신을 검증한 후 기존 shared/VideoPlayer에 실영상 연결을 별도로 적용한다. 현재 공통 플레이어는 상태 표시 중심이다.
6. 먼저 동일 Windows PC의 백엔드+Electron+USB 장치, 이후 RTSP, 파일 업로드 및 앱 PC 카메라 WebRTC 송신 순으로 검증한다. 카메라 번호는 백엔드 PC 기준이다.

backend2의 video_router.py 93~102줄 인증 처리는 삭제하지 않는다. 서비스 내부에는 WebRTC 입력 처리 일부가 있지만 현재 등록 API는 local/network만 받으므로 WebRTC 입력은 별도 확장이 필요하다.
