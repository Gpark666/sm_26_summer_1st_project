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

2. 개인 로컬에 .venv를 설정해주세요(필요시)
3. python -m pip --version 로 터미널에서 제대로 venv로 뜨는지 확인 해주세요 / 파워셀에서도 (.venv) 붙는지 확인
ex> pip 26.2.2 from C:... \sm_26_summer_1st_project\.venv\Lib\site-packages\pip (python 3.14)
(.venv)

**추가2**
python -m pip install aiortc av