#====
#비디오 송신과 수신 서비스 작동을 위한 파일
#====

#요구사항
# 엔드포인트만들어야 하는데 정보 요청하고 받는 과정이 필요하니 web rtc로 해라 
# 일단 웹캠으로 하도록 작성하되 가변성 추가해 다른 모듈로도 정보 전달가능하게 코드 짜기
# 서버 연동성, 카메라 모듈 추가 유연성
#open cv + web rtc 영상 송수신

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