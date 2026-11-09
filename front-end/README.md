# WebRTC 카메라 테스트 프론트엔드

## 기본 실행

1. 백엔드에서 JWT 환경 변수를 설정합니다.
2. `backend` 폴더의 상위인 프로젝트 폴더로 이동한 뒤, 백엔드를 모든 네트워크 인터페이스에 바인딩합니다.

   ```powershell
   cd C:\Users\hasun\Desktop\2026-2-mutsa\sm_26_summer_1st_project
   uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

   현재 폴더가 프로젝트 폴더가 아니면 `backend`를 찾지 못하므로 반드시 `cd` 명령을 먼저 실행합니다.

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

## 휴대폰 카메라 테스트: HTTPS 터널 사용

`cloudflared`는 Python 가상환경에 설치하는 패키지가 아니라 Windows 프로그램입니다.
가상환경 활성화 여부와 관계없이 사용할 수 있어야 합니다.

휴대폰 브라우저의 `getUserMedia`는 보안 컨텍스트(HTTPS)를 요구합니다.
`http://192.168.x.x:5500`으로 접속하면 `navigator.mediaDevices`가 없어 카메라를 사용할 수
없습니다. HTTPS 주소로 페이지를 열어야 합니다.

프론트엔드와 백엔드를 모두 HTTPS 터널로 공개해야 합니다. Cloudflare Tunnel을
설치하지 않았다면 관리자 PowerShell에서 다음을 실행합니다.

```powershell
winget install --id Cloudflare.cloudflared
```

설치 후 이미 열려 있던 Git Bash나 PowerShell은 PATH를 갱신하지 않으므로 반드시
터미널을 새로 열고 다음으로 확인합니다.

```powershell
cloudflared --version
```

터널 스크립트는 Windows에서 `localhost`가 IPv6(`::1`)로 해석되는 문제를 피하기
위해 원본 서버를 `127.0.0.1`로 연결합니다. 기존 터널을 실행 중이었다면 `Ctrl+C`로
종료한 뒤 스크립트를 다시 실행해야 합니다.

설치 후 기존 HTTP 서버 두 개를 먼저 실행합니다.

PowerShell 1 - 백엔드:

```powershell
cd C:\Users\hasun\Desktop\2026-2-mutsa\sm_26_summer_1st_project
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

PowerShell 2 - 프론트엔드:

```powershell
cd C:\Users\hasun\Desktop\2026-2-mutsa\sm_26_summer_1st_project\front-end
python -m http.server 5500 --bind 0.0.0.0
```

그다음 터미널을 2개 더 열어 각각 실행합니다.

PowerShell 3 - 백엔드 HTTPS 주소:

```powershell
cd C:\Users\hasun\Desktop\2026-2-mutsa\sm_26_summer_1st_project\front-end
.\start-cloudflare-tunnels.ps1 -Port 8000
```

PowerShell 4 - 프론트엔드 HTTPS 주소:

```powershell
cd C:\Users\hasun\Desktop\2026-2-mutsa\sm_26_summer_1st_project\front-end
.\start-cloudflare-tunnels.ps1 -Port 5500
```

각 터미널에 표시되는 `https://...trycloudflare.com` 주소를 사용합니다.

- 휴대폰 주소창: 프론트엔드 터널 주소
- 페이지의 백엔드 주소: 백엔드 터널 주소

예를 들어 다음처럼 입력합니다.

```text
휴대폰 주소창: https://random-name.trycloudflare.com
백엔드 주소: https://other-name.trycloudflare.com
```

터널 주소는 실행할 때마다 바뀝니다. 휴대폰과 PC가 같은 Wi-Fi일 필요는 없지만,
백엔드·프론트엔드·터널 창을 모두 켜둔 상태여야 합니다.

이 테스트 페이지는 백엔드의 `/auth/token`과 `/video/offer?camera_type=webrtc`만 사용합니다.
백엔드가 실행 중인 PC의 방화벽에서 8000번과 5500번 포트의 사설 네트워크 접근도 허용해야 합니다.
