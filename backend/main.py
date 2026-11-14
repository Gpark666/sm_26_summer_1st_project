import logging

from fastapi import FastAPI

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

# 서버 상태 체크
@app.get("/")
def root():
    return {"message": "API Server is running"}

app.include_router(video_router)
app.include_router(auth_router)