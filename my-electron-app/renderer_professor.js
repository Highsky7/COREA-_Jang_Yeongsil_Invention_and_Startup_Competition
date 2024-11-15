document.addEventListener("DOMContentLoaded", () => {
    const transcriptionWs = new WebSocket("ws://localhost:6789");
    const questionWs = new WebSocket("ws://localhost:6790");

    transcriptionWs.onopen = () => console.log("자막 WebSocket 연결 성공 (교수용)");
    questionWs.onopen = () => console.log("질문 WebSocket 연결 성공 (교수용)");

    const questionListElement = document.getElementById("questionList");

    transcriptionWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "transcription") {
            document.getElementById("transcription").innerText = message.data;
        }
    };

    questionWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "question") {
            // 질문 리스트 업데이트
            questionListElement.innerHTML = message.data
                    .map((q, index) => `<p>Q${index + 1}: ${q}</p>`)
                    .join("");
                    alert(`새로운 질문: ${message.data}`); // 새로운 질문 알림
        } else if (message.type === "request") {
            // 요청 알림 출력
            const requestContent = message.data;
            alert(`학생 요청: ${message.data}`);
            console.log(`요청 수신: ${requestContent}`);
        }
    };

    document.getElementById("startButton").onclick = () => {
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send(JSON.stringify({ type: "start" }));
            console.log("자막 생성 시작 신호 전송");
        }
    };

    document.getElementById("stopButton").onclick = () => {
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send(JSON.stringify({ type: "stop" }));
            console.log("자막 생성 중지 신호 전송");
        }
    };
});
