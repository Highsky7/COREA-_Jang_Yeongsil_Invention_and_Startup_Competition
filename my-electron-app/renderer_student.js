document.addEventListener("DOMContentLoaded", () => {
    const transcriptionWs = new WebSocket("ws://localhost:6789");
    const questionWs = new WebSocket("ws://localhost:6790");

    transcriptionWs.onopen = () => console.log("자막 WebSocket 연결 성공 (학생용)");
    questionWs.onopen = () => console.log("질문 WebSocket 연결 성공 (학생용)");

    const transcriptionElement = document.getElementById("transcription");
    const controls = document.getElementById("controls");
    const minimizedControls = document.getElementById("minimizedControls");
    const questionInputContainer = document.getElementById("questionInputContainer");
    const minimizedQuestionInput = document.getElementById("minimizedQuestionInput");

    transcriptionWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "transcription" && transcriptionElement) {
            transcriptionElement.innerText = message.data;
        }
    };

    // 언어 설정 전환 기능
    function setLanguage(language) {
        if (transcriptionWs.readyState === WebSocket.OPEN) {
            transcriptionWs.send(`language:${language}`);
            console.log(`언어 설정을 ${language === "en" ? "영어" : "한국어"}로 변경 요청했습니다.`);
        } else {
            console.warn("자막 WebSocket이 열려 있지 않습니다.");
        }
    }

    // 질문 전송 기능
    function sendQuestion() {
        const questionText = minimizedQuestionInput.value.trim();
        if (questionText && questionWs.readyState === WebSocket.OPEN) {
            questionWs.send(`question:${questionText}`);
            minimizedQuestionInput.value = ""; // 입력 필드 초기화
            questionInputContainer.style.display = "none"; // 입력 필드 숨기기
        }
    }

    // 요청 기능 (Request 버튼)
    function openRequestModal() {
        const requestModal = document.getElementById("requestModal");
        if (requestModal) {
            requestModal.style.display = "block"; // 모달 창 표시
        } else {
            console.error("requestModal 요소를 찾을 수 없습니다.");
        }
    }

    // 요청 전송 기능 (모달 내 옵션 선택)
    function sendRequest(requestText) {
        if (questionWs.readyState === WebSocket.OPEN) {
            questionWs.send(`request:${requestText}`);
            console.log(`Request 전송: ${requestText}`);
        } else {
            console.warn("질문 WebSocket이 열려 있지 않습니다.");
        }
    }

    // Minimize 버튼 기능
    document.getElementById("minimizeButton").onclick = () => {
        controls.style.display = "none"; // 기본 버튼 숨기기
        minimizedControls.style.display = "flex"; // 축소된 버튼 보이기
        transcriptionElement.style.width = "100%"; // 자막 영역 확장
        transcriptionElement.style.margin = "0 auto";
    };

    // Maximize 버튼 기능
    document.getElementById("maximizeButton").onclick = () => {
        controls.style.display = "flex"; // 기본 버튼 보이기
        minimizedControls.style.display = "none"; // 축소된 버튼 숨기기
        questionInputContainer.style.display = "none"; // 질문 입력 필드 숨기기
        transcriptionElement.style.width = "80%"; // 원래 크기로 돌아가기
    };

    // 축소된 Send Question 버튼 클릭 시 질문 입력 필드 토글
    function toggleQuestionInput() {
        questionInputContainer.style.display = questionInputContainer.style.display === "none" ? "block" : "none";
    }

    // 각 버튼에 공통 이벤트 할당
    document.getElementById("sendQuestionButton").onclick = toggleQuestionInput;
    document.getElementById("minimizedSendQuestionButton").onclick = toggleQuestionInput;
    document.getElementById("submitQuestionButton").onclick = sendQuestion;

    document.getElementById("requestButton").onclick = openRequestModal;
    document.getElementById("minimizedRequestButton").onclick = openRequestModal;

    document.getElementById("engButton").onclick = () => setLanguage("en");
    document.getElementById("minimizedEngButton").onclick = () => setLanguage("en");

    document.getElementById("korButton").onclick = () => setLanguage("ko");
    document.getElementById("minimizedKorButton").onclick = () => setLanguage("ko");

    // 모달 내 옵션 버튼 클릭 시 요청 전송
    document.getElementById("requestOption1").onclick = () => {
        sendRequest("교수님 자료가 안보입니다");
        document.getElementById("requestModal").style.display = "none"; // 모달 창 닫기
    };

    document.getElementById("requestOption2").onclick = () => {
        sendRequest("교수님 소리가 잘 안들립니다");
        document.getElementById("requestModal").style.display = "none"; // 모달 창 닫기
    };

    // 모달 닫기 버튼
    document.getElementById("closeModal").onclick = () => {
        document.getElementById("requestModal").style.display = "none";
    };
});
