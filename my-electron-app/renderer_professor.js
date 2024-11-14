document.addEventListener("DOMContentLoaded", () => {
    const transcriptionWs = new WebSocket("ws://localhost:6789");
    const questionWs = new WebSocket("ws://localhost:6790");

    transcriptionWs.onopen = () => console.log("자막 WebSocket 연결 성공");
    questionWs.onopen = () => console.log("질문 WebSocket 연결 성공");

    transcriptionWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "transcription") {
            document.getElementById("transcription").innerText = message.data;
        }
    };

    questionWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "question") {
            const questionListElement = document.getElementById("questionList");
            questionListElement.innerHTML = message.data
                .map((q, index) => `<p>Q${index + 1}: ${q}</p>`)
                .join("");
            alert(`새로운 질문: ${message.data[message.data.length - 1]}`); // 새로운 질문 알림
        } else if (message.type === "request") {
            alert(`학생 요청: ${message.data}`);
            console.log(`새로운 요청 수신: ${message.data}`);
        }
    };

    document.getElementById("startButton").onclick = () => {
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send("start");
            console.log("자막 생성 시작 신호 전송");
        }
    };

    document.getElementById("stopButton").onclick = () => {
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send("stop");
            console.log("자막 생성 중지 신호 전송");
        }
    };
});
