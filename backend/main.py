from fastapi import FastAPI

from backend.units.error_handler import register_exception_handlers
from backend.routers.auth_router import router as auth_router
from backend.routers.video_router import router as video_router

app = FastAPI()

register_exception_handlers(app)

# 서버 상태 체크
@app.get("/")
def root():
    return {"message": "API Server is running"}

app.include_router(video_router)
app.include_router(auth_router)