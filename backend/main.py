import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.units.error_handler import register_exception_handlers
from backend.routers.auth_router import router as auth_router
from backend.routers.video_router import router as video_router

# Uvicorn CMD에 인증/영상 상태를 시간, 레벨, 모듈명과 함께 표시합니다.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI()

register_exception_handlers(app)

# 개발용 테스트 프론트엔드가 다른 포트 또는 같은 Wi-Fi의 휴대폰에서
# API를 호출할 수 있도록 CORS를 허용합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서버 상태 체크
@app.get("/")
def root():
    return {"message": "API Server is running"}

app.include_router(video_router)
app.include_router(auth_router)