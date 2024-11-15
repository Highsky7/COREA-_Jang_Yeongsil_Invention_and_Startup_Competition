document.addEventListener("DOMContentLoaded", () => {
    const transcriptionWs = new WebSocket("ws://localhost:6789");
    const questionWs = new WebSocket("ws://localhost:6790");

    transcriptionWs.onopen = () => console.log("자막 WebSocket 연결 성공 (학생용)");
    questionWs.onopen = () => console.log("질문 WebSocket 연결 성공 (학생용)");

    const transcriptionElement = document.getElementById("transcription");
    const questionList = document.getElementById("questionList");
    const controls = document.getElementById("controls");
    const minimizedControls = document.getElementById("minimizedControls");
    const questionInputContainer = document.getElementById("questionInputContainer");
    const minimizedQuestionInput = document.getElementById("minimizedQuestionInput");


    // WebSocket 메시지 수신 처리
    transcriptionWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "transcription" && transcriptionElement) {
            transcriptionElement.innerText = message.data;
        }
    };

    // 실시간 질문 수신 및 업데이트
    questionWs.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "question") {
                // 질문 리스트 업데이트
                const questions = message.data || [];
                questionList.innerHTML = questions
                    .map((q, index) => `<p>Q${index + 1}: ${q}</p>`)
                    .join("");
        }
    };


    // 언어 설정 변경
    function setLanguage(language) {
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send(JSON.stringify({ type: "language", data: language }));
            console.log(`언어 설정을 ${language === "en" ? "영어" : "한국어"}로 변경 요청`);
        } else {
            console.warn("자막 WebSocket이 연결되어 있지 않습니다.");
        }
    }

    // 질문 전송
    function sendQuestion() {
        const questionText = minimizedQuestionInput.value.trim();
        if (questionText && questionWs.readyState === WebSocket.OPEN) {
            questionWs.send(JSON.stringify({ type: "question", data: questionText }));
            minimizedQuestionInput.value = ""; // 입력 필드 초기화
        } else {
            console.warn("질문 WebSocket이 연결되어 있지 않거나 입력 필드가 비어 있습니다.");
        }
    }

    // 요청 모달 창 열기
    function openRequestModal() {
        const requestModal = document.getElementById("requestModal");
        if (requestModal) {
            requestModal.style.display = "block";
        } else {
            console.error("requestModal 요소를 찾을 수 없습니다.");
        }
    }

    // 요청 전송
    function sendRequest(requestText) {
        if (questionWs.readyState === WebSocket.OPEN) {
            questionWs.send(JSON.stringify({ type: "request", data: requestText }));
        } else {
            console.warn("질문 WebSocket이 연결되어 있지 않습니다.");
        }
    }

    // UI 상태 전환 (축소)
    document.getElementById("minimizeButton").onclick = () => {
        controls.style.display = "none";
        minimizedControls.style.display = "flex";
        transcriptionElement.style.width = "80%";
        transcriptionElement.style.margin = "0 auto";
    };

    // UI 상태 전환 (확대)
    document.getElementById("maximizeButton").onclick = () => {
        controls.style.display = "flex";
        minimizedControls.style.display = "none";
        questionInputContainer.style.display = "none";
        transcriptionElement.style.width = "80%";
    };

    // 질문 입력 필드 토글
    function toggleQuestionInput() {
        questionInputContainer.style.display =
            questionInputContainer.style.display === "none" ? "block" : "none";
    }

    // 버튼 이벤트 등록
    document.getElementById("sendQuestionButton").onclick = toggleQuestionInput;
    document.getElementById("minimizedSendQuestionButton").onclick = toggleQuestionInput;
    document.getElementById("submitQuestionButton").onclick = sendQuestion;

    document.getElementById("requestButton").onclick = openRequestModal;
    document.getElementById("minimizedRequestButton").onclick = openRequestModal;

    document.getElementById("engButton").onclick = () => setLanguage("en");
    document.getElementById("minimizedEngButton").onclick = () => setLanguage("en");

    document.getElementById("korButton").onclick = () => setLanguage("ko");
    document.getElementById("minimizedKorButton").onclick = () => setLanguage("ko");

    // 요청 옵션 버튼 이벤트 등록
    document.getElementById("requestOption1").onclick = () => {
        sendRequest("교수님 자료가 안보입니다");
        document.getElementById("requestModal").style.display = "none";
    };

    document.getElementById("requestOption2").onclick = () => {
        sendRequest("교수님 소리가 잘 안들립니다");
        document.getElementById("requestModal").style.display = "none";
    };

    document.getElementById("closeModal").onclick = () => {
        document.getElementById("requestModal").style.display = "none";
    };
});
