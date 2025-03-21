document.addEventListener("DOMContentLoaded", () => {
    const transcriptionWs = new WebSocket("ws://localhost:6789");
    const questionWs = new WebSocket("ws://localhost:6790");
    const questionList = document.getElementById("questionList");
    const questionInput = document.getElementById("questionInput");
    const submitButton = document.getElementById("submitButton");
    let previousQuestions = []; // 이전 질문 저장 변수

    // 요청 전송 기능 추가
    const requestSelect = document.getElementById("requestSelect");
    const sendRequestButton = document.getElementById("sendRequestButton");

    // WebSocket 연결 성공 시 로깅
    transcriptionWs.onopen = () => {
        console.log("Transcription WebSocket connected (Student)");
    };
    questionWs.onopen = () => {
        console.log("Question WebSocket connected (Student)");
    };

    // WebSocket 연결 실패 처리
    transcriptionWs.onerror = (error) => {
        console.error("Transcription WebSocket error:", error);
    };
    questionWs.onerror = (error) => {
        console.error("Question WebSocket error:", error);
    };

    // WebSocket 메시지 처리
    transcriptionWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === "transcription") {
                document.getElementById("transcription").innerText = message.data;
            }
        } catch (error) {
            console.error("Error parsing transcription message:", error);
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
            }
        } catch (error) {
            console.error("Error processing question message:", error);
        }
    };

    // 질문 전송 함수 (공통 처리)
    const sendQuestion = () => {
        const question = questionInput.value.trim();
        if (question && questionWs.readyState === WebSocket.OPEN) {
            questionWs.send(JSON.stringify({ type: "question", data: question }));
            questionInput.value = ""; // 입력 필드 초기화
        }
    };

    // Enter 키 입력 처리
    questionInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            sendQuestion();
        }
    });

    // Submit 버튼 클릭 처리
    submitButton.addEventListener("click", () => {
        sendQuestion();
    });

    sendRequestButton.addEventListener("click", () => {
        const selectedRequest = requestSelect.value;
        if (questionWs.readyState === WebSocket.OPEN) {
            questionWs.send(JSON.stringify({ type: "request", data: selectedRequest }));
            console.log(`Request sent: ${selectedRequest}`);
        } else {
            console.warn("WebSocket is not open. Request not sent.");
        }
    });

    // 언어 변경 처리
    const languageSelect = document.getElementById("languageSelect");
    languageSelect.addEventListener("change", (event) => {
        const selectedLanguage = event.target.value;
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send(JSON.stringify({ type: "set_language", data: selectedLanguage }));
            console.log(`Language set to: ${selectedLanguage === "en" ? "English" : "Korean"}`);
        } else {
            console.warn("Transcription WebSocket is not open. Language not set.");
        }
    });
});
