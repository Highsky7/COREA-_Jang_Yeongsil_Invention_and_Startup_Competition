document.addEventListener("DOMContentLoaded", () => {
    // WebSocket 연결
    const ws = new WebSocket("ws://localhost:6789");

    ws.onopen = () => console.log("WebSocket 연결 성공");

    ws.onerror = (error) => console.log("WebSocket 연결 오류:", error);

    ws.onmessage = (event) => {
        const transcriptionElement = document.getElementById("transcription");
        transcriptionElement.innerText = event.data; // 수신한 자막을 화면에 표시
    };

    // Start Transcription 버튼 클릭 시 Python에 시작 신호 전송
    document.getElementById("startButton").onclick = () => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send("start");
            console.log("Python에 자막 생성 시작 신호 전송");
        }
    };

    // Stop Transcription 버튼 클릭 시 Python에 중지 신호 전송
    document.getElementById("stopButton").onclick = () => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send("stop");
            console.log("Python에 자막 생성 중지 신호 전송");
        }
    };

    ws.onclose = () => {
        console.log("WebSocket 연결이 닫혔습니다.");
        document.getElementById("transcription").innerText = "Disconnected from server.";
    };
});
