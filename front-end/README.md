# WebRTC 카메라 테스트 프론트엔드

## 실행 순서

1. 백엔드에서 JWT 환경 변수를 설정합니다.
2. 프로젝트 루트에서 백엔드를 모든 네트워크 인터페이스에 바인딩합니다.

   ```powershell
   uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

3. 다른 터미널에서 이 폴더를 정적 파일 서버로 실행합니다.

   ```powershell
   cd C:\Users\hasun\Desktop\2026-2-mutsa\sm_26_summer_1st_project\front-end
   python -m http.server 5500 --bind 0.0.0.0
   ```

4. PC의 내부 IP를 확인합니다.

   ```powershell
   ipconfig
   ```

5. 휴대폰과 PC를 같은 Wi-Fi에 연결하고, 프론트엔드를 엽니다.

   `http://PC의_내부_IP:5500`

6. 화면의 `백엔드 주소`를 `http://PC의_내부_IP:8000`으로 입력합니다.
7. 백엔드 환경 변수의 아이디·비밀번호를 입력하고 `로그인 후 카메라 시작`을 누릅니다.

## 카메라 권한 주의

휴대폰 브라우저의 `getUserMedia`는 보안 컨텍스트(HTTPS)를 요구할 수 있습니다.
HTTP 주소에서 카메라 권한이 거부되면 HTTPS로 정적 페이지를 제공하거나, 개발용 HTTPS 터널을 사용해야 합니다.

이 테스트 페이지는 백엔드의 `/auth/token`과 `/video/offer?camera_type=webrtc`만 사용합니다.
백엔드가 실행 중인 PC의 방화벽에서 8000번과 5500번 포트의 사설 네트워크 접근도 허용해야 합니다.
