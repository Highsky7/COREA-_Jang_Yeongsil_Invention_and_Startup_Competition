const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindows() {
    // 교수님용 창 생성
    const professorWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "renderer_professor.js"), // 교수님용 스크립트 로드
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 학생용 창 생성
    const studentWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "renderer_student.js"), // 학생용 스크립트 로드
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // HTML 파일 로드
    professorWindow.loadFile("professor.html");
    studentWindow.loadFile("student.html");

    // 개발자 도구 열기 (테스트용)
    professorWindow.webContents.openDevTools();
    studentWindow.webContents.openDevTools();
}

app.whenReady().then(createWindows);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindows();
    }
});
