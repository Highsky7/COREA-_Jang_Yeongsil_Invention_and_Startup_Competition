import sounddevice as sd
import whisper
import numpy as np
import threading
import time
from queue import Queue

# Whisper 모델 로드
model = whisper.load_model("base")

# 오디오 캡처 설정
CHANNELS = 1
RATE = 16000
CHUNK = 1024

# 오디오 큐 생성
audio_queue = Queue()

def audio_callback(indata, frames, time, status):
    """sounddevice 콜백: 오디오 데이터를 큐에 추가"""
    if status:
        print(status)
    audio_data = indata[:, 0]  # 모노 채널 사용
    audio_queue.put(audio_data.copy())

# 오디오 스트림 시작
def start_audio_stream():
    stream = sd.InputStream(callback=audio_callback, channels=CHANNELS, samplerate=RATE, blocksize=CHUNK)
    stream.start()
    return stream

def transcribe_audio():
    """오디오 데이터를 변환하여 자막 생성"""
    while True:
        # 일정 시간의 오디오를 누적하여 버퍼를 만듭니다.
        buffer = []
        while len(buffer) < RATE // CHUNK * 5:  # 5초 간격으로 처리
            buffer.extend(audio_queue.get())

        audio_data = np.array(buffer, dtype=np.float32)
        
        # 음성 인식 수행 (언어 자동 감지)
        result = model.transcribe(audio_data)
        
        # 터미널에 자막 출력
        print("Transcription:", result["text"])
        time.sleep(0.5)

def start_transcription():
    """자막 생성 쓰레드 시작"""
    transcription_thread = threading.Thread(target=transcribe_audio)
    transcription_thread.start()

# 프로그램 실행
stream = start_audio_stream()
start_transcription()

# 터미널에서 프로그램 종료를 기다림
try:
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    print("\n프로그램을 종료합니다.")
finally:
    stream.close()
