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

# Whisper 모델 로드 (GPU 모드로 실행)
model = whisper.load_model("medium", device="cuda")

# 오디오 캡처 설정
CHANNELS = 1
RATE = 16000
CHUNK = 1024
DURATION = 3
HIGH_PASS_CUTOFF = 90

# 오디오 큐 생성 및 초기 설정
audio_queue = queue.Queue()
current_language = "ko"
transcription_active = False

# 각 서버의 클라이언트 세트 및 질문과 요청 리스트
transcription_clients = set()
question_clients = set()
questions_list = []
request_clients = set()  # 요청을 수신할 클라이언트 (교수용)

def audio_callback(indata, frames, time, status):
    if status:
        print("Status:", status)
    audio_queue.put(indata.copy())

def start_audio_stream():
    stream = sd.InputStream(callback=audio_callback, channels=CHANNELS, samplerate=RATE, blocksize=CHUNK)
    stream.start()
    return stream

async def transcribe_audio():
    global transcription_active, current_language
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

        # 현재 언어 설정 확인
        print(f"현재 언어 설정: {current_language}")

        result = model.transcribe(
            wav_file,
            temperature=0.3,
            best_of=1,
            beam_size=3,
            language=current_language,  # 현재 언어로 설정
            suppress_tokens="-1",
            condition_on_previous_text=False
        )

        transcription = result["text"].strip()
        print("Transcription:", transcription)
        await send_to_transcription_clients({"type": "transcription", "data": transcription})
        os.remove(wav_file)


async def send_to_transcription_clients(message):
    for client in list(transcription_clients):
        try:
            await client.send(json.dumps(message))
        except:
            transcription_clients.discard(client)

async def send_to_question_clients(message):
    for client in list(question_clients):
        try:
            await client.send(json.dumps(message))
        except:
            question_clients.discard(client)

async def send_to_request_clients(message):
    """ 요청 WebSocket 클라이언트에 메시지 전송 """
    for client in list(question_clients):  # 교수용 클라이언트에 전송하도록 수정
        try:
            await client.send(json.dumps(message))
        except:
            question_clients.discard(client)

async def transcription_handler(websocket, path):
    transcription_clients.add(websocket)
    global current_language
    try:
        async for message in websocket:
            if message == "start":
                global transcription_active
                transcription_active = True
                print("자막 생성 시작 신호를 받았습니다.")
            elif message == "stop":
                transcription_active = False
                print("자막 생성 중지 신호를 받았습니다.")
            elif message.startswith("language:"):
                # 언어 설정 변경
                new_language = message.split("language:", 1)[1]
                if new_language in ["en", "ko"]:
                    current_language = new_language
                    print(f"언어가 {('영어' if new_language == 'en' else '한국어')}로 변경되었습니다.")
    finally:
        transcription_clients.discard(websocket)


async def question_handler(websocket, path):
    question_clients.add(websocket)
    try:
        async for message in websocket:
            if message.startswith("question:"):
                question_text = message.split("question:", 1)[1]
                questions_list.append(question_text)
                print("새로운 질문:", question_text)
                await send_to_question_clients({"type": "question", "data": questions_list})
            elif message.startswith("request:"):
                # 요청 메시지 처리
                request_text = message.split("request:", 1)[1]
                print("새로운 요청:", request_text)
                await send_to_request_clients({"type": "request", "data": request_text})
    finally:
        question_clients.discard(websocket)

def start_transcription_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(websockets.serve(transcription_handler, "localhost", 6789))
    loop.run_forever()

def start_question_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(websockets.serve(question_handler, "localhost", 6790))
    loop.run_forever()

stream = start_audio_stream()

transcription_server_thread = threading.Thread(target=start_transcription_server, daemon=True)
question_server_thread = threading.Thread(target=start_question_server, daemon=True)
transcription_server_thread.start()
question_server_thread.start()

transcription_thread = threading.Thread(target=lambda: asyncio.run(transcribe_audio()), daemon=True)
transcription_thread.start()

try:
    transcription_server_thread.join()
    question_server_thread.join()
except KeyboardInterrupt:
    print("\n프로그램을 종료합니다.")
finally:
    stream.close()
