# Backend workspace

백엔드 코드는 아래 역할 단위로 나눕니다. 프레임워크와 구현 방식은 담당자가 선택하되, 폴더의 책임과 의존성 방향은 지킵니다.

```text
routers -> services -> db
                  -> workers
```

- `config`: 실행 환경과 공통 설정
- `db`: 데이터베이스 연결과 데이터 접근
- `routers`: HTTP API의 입구
- `services`: 도메인·비즈니스 로직
- `workers`: 오래 걸리거나 비동기인 작업
- `units`: 여러 영역에서 재사용하는 작은 단위 기능

`routers`에 비즈니스 로직이나 직접적인 DB 쿼리를 넣지 않습니다. 공통 기능이 아닌 도메인 로직은 `services`에 둡니다.

**작업 중 추가 사항 공지**
1. fastapi의 패키지, uvicorn이 필요합니다.
pip install fastapi "uvicorn[standard]" sqlalchemy pymysql cryptography python-dotenv pyjwt "passlib[bcrypt]" "bcrypt==4.0.1" opencv-python aiortc av
위 코드를 사용해 install해주세요.

JWT 인증을 사용하려면 서버 실행 전에 다음 환경 변수를 설정합니다.

```powershell
$env:JWT_SECRET_KEY = "개발용으로 충분히 긴 임의의 문자열"
$env:JWT_EXPIRE_MINUTES = "60"
$env:AUTH_USERNAME = "demo"
$env:AUTH_PASSWORD = "개발용 비밀번호"
```

`POST /auth/token`에 `{"username":"demo","password":"개발용 비밀번호"}`를 보내면
JWT를 발급받습니다. 이후 `/video/offer` 요청에
`Authorization: Bearer <access_token>` 헤더를 넣어야 합니다.

인증 성공 응답에는 `status`, `message`, `access_token`, `expires_in`이 포함됩니다.
인증 실패나 만료 토큰은 `status`, `error_code`, `message` 형식으로 반환됩니다.
인증 성공·실패와 토큰 만료 정보는 서버를 실행한 CMD에도 기록됩니다.

2. 개인 로컬에 .venv를 설정해주세요(필요시)
3. python -m pip --version 로 터미널에서 제대로 venv로 뜨는지 확인 해주세요 / 파워셀에서도 (.venv) 붙는지 확인
ex> pip 26.2.2 from C:... \sm_26_summer_1st_project\.venv\Lib\site-packages\pip (python 3.14)
(.venv)

**추가2**
python -m pip install aiortc av