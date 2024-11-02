document.addEventListener("DOMContentLoaded", () => {
    const ws = new WebSocket("ws://localhost:6789");

    ws.onopen = () => console.log("WebSocket 연결 성공 (학생용)");

    ws.onmessage = (event) => {
        const transcriptionElement = document.getElementById("transcription");
        transcriptionElement.innerText = event.data;
    };
});
