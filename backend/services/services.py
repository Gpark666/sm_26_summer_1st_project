from backend.units.error_handler import CameraNotFoundException, VideoReadException, StreamDisconnectedException, register_exception_handlers #units에서 에러 핸들러 불러옴
import cv2



def get_camera_stream():
    cap = cv2.VideoCapture(0) # 또는 폰 카메라 URL
    
    if not cap.isOpened():
        # 카메라 장치 인식 실패 시 즉시 에러 발생
        raise CameraNotFoundException()
        
    ret, frame = cap.read()
    if not ret:
        # 프레임 읽기 실패 시 에러 발생
        raise VideoReadException()
        
    return frame