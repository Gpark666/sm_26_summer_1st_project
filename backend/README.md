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
