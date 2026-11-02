# AI Server

실시간 영상 프레임에서 객체를 탐지하고, 표준화된 탐지 이벤트를 생성하는 서비스입니다.

## 목표

- 현재: 로컬 동영상 폴더를 입력으로 사용해 YOLO 기반 객체 탐지 파이프라인을 검증합니다.
- 이후: 스트림 서버가 제공하는 WebRTC 스트림을 구독하는 입력 어댑터를 연결합니다.
- 공통: 입력 방식이 바뀌어도 추론·추적·이벤트 출력 파이프라인은 유지합니다.

## 입력 전환 구조

```text
개발·테스트: 동영상 폴더 -> FileVideoSource
서비스 통합: 스트림 서버 WebRTC -> WebRTCVideoSource
                                  ↓
                    Frame sampler -> YOLO inference -> Detection event
```

동영상 파일 자체는 WebRTC가 아니므로, 초기 단계에서는 파일 입력으로 AI 처리 성능과 이벤트 형식을 먼저 검증합니다. WebRTC 연결 검증은 스트림 서버 통합 단계에서 수행합니다.

## 예정 디렉토리 구조

```text
AI-server/
├── app/
│   ├── sources/       # 파일/WebRTC 등의 영상 입력 어댑터
│   ├── inference/     # 모델 로딩과 추론
│   ├── tracking/      # 객체 추적(필요 시)
│   ├── events/        # 탐지 이벤트 직렬화·전송
│   └── main.py        # 서비스 진입점
├── models/            # 배포용 모델 가중치(대용량 파일은 Git 제외)
├── tests/
└── requirements.txt
```

## 탐지 이벤트 초안

AI 서버는 영상이 아니라 아래와 같은 메타데이터를 백엔드에 전달합니다.

```json
{
  "camera_id": "test-camera-01",
  "timestamp": "2026-11-02T10:00:00Z",
  "class_name": "person",
  "confidence": 0.94,
  "bbox": { "x": 120, "y": 80, "width": 90, "height": 210 }
}
```

초기에는 콘솔 또는 JSON Lines 파일로 이벤트를 기록하고, 백엔드 통합 후 HTTP API나 메시지 브로커 출력으로 교체합니다.

## 개발 원칙

- 영상 입력부와 추론부를 분리합니다.
- 카메라 ID, 프레임 시각, 좌표계(원본 프레임 기준)를 모든 이벤트에 포함합니다.
- 모델 가중치·원본 영상·비밀 값은 Git에 커밋하지 않습니다.
