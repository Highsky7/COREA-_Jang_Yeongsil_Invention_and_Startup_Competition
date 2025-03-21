document.addEventListener("DOMContentLoaded", () => {
    const transcriptionWs = new WebSocket("ws://localhost:6789");
    const questionWs = new WebSocket("ws://localhost:6790");
    const questionList = document.getElementById("questionList");
    let previousQuestions = []; // 이전 질문 저장 변수
    let processedRequests = []; // 이미 처리된 요청 저장 배열

    if (!questionList) {
        console.error("Error: #questionList element not found in professor.html!");
        return;
    }

    transcriptionWs.onopen = () => console.log("Transcription WebSocket connected (Professor)");
    questionWs.onopen = () => console.log("Question WebSocket connected (Professor)");

    transcriptionWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "transcription") {
            document.getElementById("transcription").innerText = message.data;
        }
    };

    questionWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === "question") {
                const currentQuestions = message.data || [];
            // 새로 추가된 질문 필터링
            const newQuestions = currentQuestions.slice(previousQuestions.length);

            // 질문 리스트 업데이트
            questionList.innerHTML = currentQuestions
                .map((q, index) => `<p>Q${index + 1}: ${q}</p>`)
                .join("");

            // 이전 질문 리스트를 업데이트
            previousQuestions = [...currentQuestions];
            } else if (message.type === "request") {
                if (!processedRequests.includes(message.data)) {
                    alert(`Request received: ${message.data}`);
                    processedRequests.push(message.data);
                } 
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    };

    // Start and Stop Transcription
    document.getElementById("startTranscriptionButton").onclick = () => {
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send(JSON.stringify({ type: "start_transcription" }));
            console.log("Sent Start Transcription command");
        } else {
            console.warn("WebSocket not connected.");
        }
    };////

    document.getElementById("stopTranscriptionButton").onclick = () => {
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send(JSON.stringify({ type: "stop_transcription" }));
            console.log("Sent Stop Transcription command");
        } else {
            console.warn("WebSocket not connected.");
        }
    };

    // Handle Language Change
    document.getElementById("languageSelect").onchange = (event) => {
        const selectedLanguage = event.target.value;
        transcriptionWs.send(JSON.stringify({ type: "set_language", data: selectedLanguage }));
        console.log(`Language set to: ${selectedLanguage === "en" ? "English" : "Korean"}`);
    };

    document.querySelector(".copy-button").onclick = () => {
        const link = document.querySelector(".invite-link").textContent;
        navigator.clipboard.writeText(link).then(() => alert("Invite link copied to clipboard!"));
    };
});
