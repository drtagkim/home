const LABELS = {
    en: {
        title: "CAT TETRIS",
        start: "START MEOW",
        hold: "HOLD",
        score: "SCORE",
        level: "LEVEL",
        lines: "LINES",
        next: "NEXT",
        controls: "CONTROLS",
        gameOver: "GAME OVER",
        tryAgain: "TRY AGAIN",
        paused: "PAUSED",
        resume: "RESUME",
        move: "Move",
        rotate: "Rotate",
        softDrop: "Soft Drop",
        hardDrop: "Hard Drop",
        holdKey: "Hold",
        pauseKey: "Pause",
        langToggle: "한글로 변경"
    },
    ko: {
        title: "고양이 테트리스",
        start: "게임 시작",
        hold: "저장",
        score: "점수",
        level: "레벨",
        lines: "줄",
        next: "다음",
        controls: "조작법",
        gameOver: "게임 오버",
        tryAgain: "다시 하기",
        paused: "일시 정지",
        resume: "계속 하기",
        move: "이동",
        rotate: "회전",
        softDrop: "천천히 내리기",
        hardDrop: "한방에 내리기",
        holdKey: "저장하기",
        pauseKey: "일시정지",
        langToggle: "Switch to English"
    }
};

let currentLang = 'ko'; // Default to Korean as requested implicitly by "Han-geul-hwa"

function getLabel(key) {
    return LABELS[currentLang][key] || key;
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ko' : 'en';
    updateText();
    return currentLang;
}

function updateText() {
    // Static IDs
    const map = {
        'title-text': 'title',
        'start-btn': 'start',
        'label-hold': 'HOLD!',
        'label-score': 'score',
        'label-level': 'level',
        'label-lines': 'lines',
        'label-next': 'next',
        'label-controls': 'controls',
        'game-over-title': 'gameOver',
        'restart-btn': 'tryAgain',
        'pause-title': 'paused',
        'resume-btn': 'resume',
        'lang-btn': 'langToggle'
    };

    for (const [id, key] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.innerText = getLabel(key);
    }

    // Dynamic Controls List
    const controlsMap = {
        'ctrl-move': 'move',
        'ctrl-rotate': 'rotate',
        'ctrl-soft': 'softDrop',
        'ctrl-hard': 'hardDrop',
        'ctrl-hold': 'holdKey',
        'ctrl-pause': 'pauseKey'
    };

    for (const [id, key] of Object.entries(controlsMap)) {
        const el = document.getElementById(id);
        if (el) el.innerText = getLabel(key);
    }

    // Update document title
    document.title = getLabel('title');
}
