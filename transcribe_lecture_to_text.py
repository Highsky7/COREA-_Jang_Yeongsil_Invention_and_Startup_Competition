import sounddevice as sd
import whisper
import numpy as np
import threading
import queue
import asyncio
import websockets
import json
import re
import scipy.io.wavfile as wav
from scipy.signal import butter, lfilter
import os

# Whisper 모델 로드 (CPU 모드로 강제 실행)
model = whisper.load_model("medium", device="cuda")

# 오디오 캡처 설정
CHANNELS = 1
RATE = 16000
CHUNK = 1024
DURATION = 5  # 5초 단위로 처리
HIGH_PASS_CUTOFF = 90  # 90hz 이상만 음성으로 처리

# 오디오 큐 생성 및 초기 설정
audio_queue = queue.Queue()
current_language = "ko"
transcription_active = False

# 각 서버의 클라이언트 세트 및 질문 리스트
transcription_clients = set()
question_clients = set()
questions_list = []

def audio_callback(indata, frames, time, status):
    """ 오디오 캡처 콜백 함수 """
    if status:
        print("Status:", status)
    audio_queue.put(indata.copy())

def start_audio_stream():
    """ 오디오 스트림 시작 """
    stream = sd.InputStream(callback=audio_callback, channels=CHANNELS, samplerate=RATE, blocksize=CHUNK)
    stream.start()
    return stream

def high_pass_filter(data, cutoff=HIGH_PASS_CUTOFF, fs=RATE, order=5):
    """ 고역 필터를 적용하여 저주파 소음 제거 """
    nyquist = 0.5 * fs
    normal_cutoff = cutoff / nyquist
    b, a = butter(order, normal_cutoff, btype='high', analog=False)
    y = lfilter(b, a, data)
    return y

def filter_repeated_phrases(text):
    """ 반복된 음절, 단어, 문장 필터링 """
    filtered_text = re.sub(r'(.)\1{2,}', r'\1', text)
    filtered_text = re.sub(r'(\b\w+\b)( \1)+', r'\1', filtered_text)
    filtered_text = re.sub(r'(.+?)\s*(?=\1\b)', '', filtered_text)
    return filtered_text.strip()

async def transcribe_audio():
    """ 오디오 데이터를 Whisper 모델에 전달하여 텍스트 생성 후 WebSocket으로 전송 """
    global transcription_active
    while True:
        if not transcription_active:
            await asyncio.sleep(0.5)
            continue

        audio_frames = []
        try:
            for _ in range(int(RATE / CHUNK * DURATION)):
                audio_chunk = audio_queue.get(timeout=5)
                audio_frames.append(audio_chunk)
        except queue.Empty:
            print("큐가 비어 있습니다. 오디오 데이터를 기다리는 중...")
            await asyncio.sleep(1)
            continue

        if not audio_frames:
            print("오디오 데이터가 없어 건너뜁니다.")
            continue

        audio_data = np.concatenate(audio_frames, axis=0).astype(np.float32)
        wav_file = "temp_audio.wav"
        wav.write(wav_file, RATE, audio_data)

        result = model.transcribe(
            wav_file,
            temperature=0.3,
            best_of=3,
            beam_size=5,
            language=current_language,
            suppress_tokens="-1",
            condition_on_previous_text=False
        )

        transcription = result["text"].strip()
        transcription = filter_repeated_phrases(transcription)
        print("Transcription:", transcription)

        # 모든 자막 클라이언트로 전송
        await send_to_transcription_clients({"type": "transcription", "data": transcription})
        os.remove(wav_file)

async def send_to_transcription_clients(message):
    """ 자막 WebSocket 클라이언트에 메시지 전송 """
    for client in list(transcription_clients):
        try:
            await client.send(json.dumps(message))
        except:
            transcription_clients.discard(client)  # 안전하게 제거

async def send_to_question_clients(message):
    """ 질문 WebSocket 클라이언트에 메시지 전송 """
    for client in list(question_clients):
        try:
            await client.send(json.dumps(message))
        except:
            question_clients.discard(client)  # 안전하게 제거

async def transcription_handler(websocket, path):
    """ 자막 WebSocket 핸들러 """
    transcription_clients.add(websocket)
    try:
        async for message in websocket:
            if message == "start":
                global transcription_active
                transcription_active = True
                print("자막 생성 시작 신호를 받았습니다.")
            elif message == "stop":
                transcription_active = False
                print("자막 생성 중지 신호를 받았습니다.")
    finally:
        transcription_clients.discard(websocket)  # 안전하게 제거

async def question_handler(websocket, path):
    """ 질문 WebSocket 핸들러 """
    question_clients.add(websocket)
    try:
        async for message in websocket:
            if message.startswith("question:"):
                question_text = message.split("question:", 1)[1]
                questions_list.append(question_text)
                print("새로운 질문:", question_text)

                await send_to_question_clients({"type": "question", "data": questions_list})
    finally:
        question_clients.discard(websocket)  # 안전하게 제거

def start_transcription_server():
    """ 자막 WebSocket 서버 실행 """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(websockets.serve(transcription_handler, "localhost", 6789))
    loop.run_forever()

def start_question_server():
    """ 질문 WebSocket 서버 실행 """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(websockets.serve(question_handler, "localhost", 6790))
    loop.run_forever()

# 프로그램 실행
stream = start_audio_stream()

# 자막 및 질문 서버 실행을 위한 스레드 설정
transcription_server_thread = threading.Thread(target=start_transcription_server, daemon=True)
question_server_thread = threading.Thread(target=start_question_server, daemon=True)
transcription_server_thread.start()
question_server_thread.start()

# 자막 생성 쓰레드 시작
transcription_thread = threading.Thread(target=lambda: asyncio.run(transcribe_audio()), daemon=True)
transcription_thread.start()

# 메인 스레드 유지
try:
    transcription_server_thread.join()
    question_server_thread.join()
except KeyboardInterrupt:
    print("\n프로그램을 종료합니다.")
finally:
    stream.close()
