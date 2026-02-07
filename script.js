// Game Configuration
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextContext = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdContext = holdCanvas.getContext('2d');

canvas.width = 360;
canvas.height = 600;

nextCanvas.width = 150;
nextCanvas.height = 150;
holdCanvas.width = 150;
holdCanvas.height = 150;

const SCALE = 30;

context.scale(SCALE, SCALE);
nextContext.scale(SCALE, SCALE);
holdContext.scale(SCALE, SCALE);

const COLORS = [
    null,
    '#FFAB91', '#81D4FA', '#A5D6A7', '#CE93D8', '#FFCC80', '#FFF59D', '#90CAF9'
];

// Load "Cat Faces V4" (No Borders)
const spriteSheet = new Image();
spriteSheet.src = 'assets/cat_faces_grid_v4.png';

let spriteLoaded = false;

spriteSheet.onload = () => {
    spriteLoaded = true;
    console.log(`Sprite loaded. Dimensions: ${spriteSheet.width}x${spriteSheet.height}`);
    draw();
};

// --- MASCOT SETUP (Moved to top) ---
const mascot = new Mascot(
    'mascot-canvas',
    'assets/cat_mascot_master_v1.png'
);

const PIECES = 'ILJOTSZ';

let arena = createMatrix(12, 20);
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    level: 1,
    lines: 0,
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isPaused = false;
let isGameOver = false;
let gameStarted = false;

let isAnimating = false;
let animationStartTime = 0;
let clearingRows = [];
const ANIMATION_DURATION = 600;

let nextPiece = null;
let holdPiece = null;
let canHold = true;
let animationId = null;

function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === 'L') {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ];
    } else if (type === 'J') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ];
    } else if (type === 'O') {
        return [
            [4, 4],
            [4, 4],
        ];
    } else if (type === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'T') {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ];
    }
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// ----------------------
// DRAWING LOGIC UPDATE
// ----------------------
function drawBlock(ctx, x, y, value, rotation = 0, scale = 1, opacity = 1) {
    if (value === 0) return;

    ctx.save();
    const cx = x + 0.5;
    const cy = y + 0.5;
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;
    ctx.translate(-cx, -cy);

    if (spriteLoaded) {
        // Grid Logic (3 Columns)
        const cols = 3;
        const rows = 3; // 3x3 grid

        // Calculate cell size
        const sw = spriteSheet.width / cols;
        const sh = spriteSheet.height / rows;

        // Index is 0-based (value 1 -> index 0)
        const index = value - 1;
        const col = index % cols;
        const row = Math.floor(index / cols);

        const sx = col * sw;
        const sy = row * sh;

        // Draw slightly larger to avoid gaps
        ctx.drawImage(spriteSheet, sx, sy, sw, sh, x, y, 1.05, 1.05);
    } else {
        // Fallback
        ctx.fillStyle = COLORS[value];
        ctx.roundRect(x + 0.05, y + 0.05, 0.9, 0.9, 0.2);
        ctx.fill();
    }

    ctx.restore();
}

function drawMatrix(matrix, offset, ctx = context, opacity = 1) {
    matrix.forEach((row, y) => {
        const actualY = y + offset.y;
        if (isAnimating && clearingRows.includes(actualY) && ctx === context) return;

        row.forEach((value, x) => {
            if (value !== 0) {
                // Pass opacity to drawBlock
                drawBlock(ctx, x + offset.x, actualY, value, 0, 1, opacity);
            }
        });
    });
}

function drawClearingRows(dt) {
    if (!isAnimating) return;
    const progress = dt / ANIMATION_DURATION;
    const angle = Math.sin(dt * 0.02) * (15 * Math.PI / 180);
    let scale = 1;
    let opacity = 1;
    if (progress > 0.7) {
        scale = 1 - (progress - 0.7) * 3;
        opacity = 1 - (progress - 0.7) * 3;
    }
    if (scale < 0) scale = 0;
    if (opacity < 0) opacity = 0;

    clearingRows.forEach(y => {
        const row = arena[y];
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(context, x, y, value, angle, scale, opacity);
            }
        });
    });
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(255, 243, 224, 0.2)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 });

    if (isAnimating) {
        const dt = performance.now() - animationStartTime;
        drawClearingRows(dt);
    }

    if (!isGameOver && !isPaused && gameStarted && !isAnimating) {
        const ghostPos = { ...player.pos };
        while (!collide(arena, { pos: ghostPos, matrix: player.matrix })) {
            ghostPos.y++;
        }
        ghostPos.y--;

        // Pass 0.3 opacity for Shadow/Ghost Block
        drawMatrix(player.matrix, ghostPos, context, 0.3);
    }

    if (player.matrix && !isAnimating) {
        drawMatrix(player.matrix, player.pos);
    }
}

// Helper to center pieces visually
function getBoundingBox(matrix) {
    let minX = matrix[0].length, maxX = -1, minY = matrix.length, maxY = -1;
    let found = false;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        });
    });
    return found ? { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 } : null;
}

function drawNext() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const bbox = getBoundingBox(nextPiece);
        if (bbox) {
            // Visual centering in 5x5 grid
            const centerX = 5 / 2;
            const centerY = 5 / 2;

            const pieceCenterX = bbox.minX + bbox.width / 2;
            const pieceCenterY = bbox.minY + bbox.height / 2;

            const offsetX = centerX - pieceCenterX;
            const offsetY = centerY - pieceCenterY;

            drawMatrix(nextPiece, { x: offsetX, y: offsetY }, nextContext);
        }
    }
}

function drawHold() {
    holdContext.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        const bbox = getBoundingBox(holdPiece);
        if (bbox) {
            const centerX = 5 / 2;
            const centerY = 5 / 2;

            const pieceCenterX = bbox.minX + bbox.width / 2;
            const pieceCenterY = bbox.minY + bbox.height / 2;

            const offsetX = centerX - pieceCenterX;
            const offsetY = centerY - pieceCenterY;

            drawMatrix(holdPiece, { x: offsetX, y: offsetY }, holdContext);
        }
    }
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

let lockDelay = 0;
const LOCK_DELAY_LIMIT = 500; // 0.5 seconds

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;

        // --- LOCK DELAY LOGIC ---
        // Instead of immediate merge, we wait
        if (lockDelay < LOCK_DELAY_LIMIT) {
            // If we are grounded, increment lock delay by drop interval (or frame time)
            // But playerDrop is called every `dropInterval`.
            // So we can just check if we exceeded limit?
            // A better way for smooth lock delay: 
            // We return and let the next update loop handle it? 
            // But we need to accumulate time.

            // Actually, we should just return here and let the `update` loop call playerDrop again.
            // But we need to track how long we've been stuck.
            // Let's use `dt` from update loop?
            // Simpler: We just don't merge yet, but we enforce merge if it happens too many times?

            // Standard approach: Reset lock time on successful move.
            // Here: We increment lock time.

            // Since playerDrop is called by the interval, we can use that.
            // But user might be rotating quickly.

            // Let's use a timestamp approach in `update()` instead.
            // But to keep it simple within this function structure:

            // We'll use a global `lockTimer` that accumulates in `update()`.
            // Here we just signal "grounded".
            return;
        }

        // If Delay Exceeded:
        merge(arena, player);
        sounds.playDrop(); // Sound
        playerReset();
        checkLines();
        updateScore();
        canHold = true;
        lockDelay = 0; // Reset
    } else {
        // Falling freely
        dropCounter = 0;
        // lockDelay should be reset if we fall successfully?
        lockDelay = 0;
    }
}

function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    sounds.playHardDrop(); // Sound
    playerReset();
    checkLines();
    updateScore();
    canHold = true;
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    } else {
        sounds.playMove(); // Sound
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    sounds.playRotate(); // Sound
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerReset() {
    if (nextPiece === null) nextPiece = createPiece(PIECES[PIECES.length * Math.random() | 0]);

    player.matrix = nextPiece;
    nextPiece = createPiece(PIECES[PIECES.length * Math.random() | 0]);
    drawNext();

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
        (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        gameOver();
    }
}

function playerHold() {
    if (!canHold || !gameStarted || isPaused || isAnimating) return;

    if (holdPiece === null) {
        holdPiece = player.matrix;
        playerReset();
    } else {
        const temp = player.matrix;
        player.matrix = holdPiece;
        holdPiece = temp;
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    }

    canHold = false;
    drawHold();
    drawNext();
}

function checkLines() {
    let rowsToClear = [];
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        rowsToClear.push(y);
    }

    if (rowsToClear.length > 0) {
        startClearAnimation(rowsToClear);
    }
}

function startClearAnimation(rows) {
    isAnimating = true;
    clearingRows = rows;
    animationStartTime = performance.now();
    sounds.playMeow();

    // Trigger Mascot Reaction IMMEDIATELY when lines start clearing
    if (rows.length > 0) {
        mascot.playReaction(rows.length);
    }

    draw();
}

function finalizeClear() {
    let rowCount = clearingRows.length;
    let newArena = arena.filter((row, y) => !clearingRows.includes(y));
    while (newArena.length < 20) {
        newArena.unshift(new Array(12).fill(0));
    }
    arena = newArena;

    // Scoring
    const points = [0, 100, 300, 500, 800];
    player.score += points[rowCount] * player.level;
    player.lines += rowCount;
    player.level = Math.floor(player.lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (player.level - 1) * 100);

    // NOTE: Mascot reaction triggered in startClearAnimation now to be more responsive.
    // We do NOT trigger it here again.

    updateScore();
    isAnimating = false;
    clearingRows = [];
}

function calculateDangerLevel() {
    for (let y = 0; y < arena.length; ++y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] !== 0) {
                return (arena.length - y) / arena.length;
            }
        }
    }
    return 0;
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
    document.getElementById('level').innerText = player.level;
    document.getElementById('lines').innerText = player.lines;
}

function gameOver() {
    isGameOver = true;
    gameStarted = false;
    sounds.playGameOver();
    sounds.stopBGM();
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').innerText = player.score;
    cancelAnimationFrame(animationId);
}

function startGame() {
    if (gameStarted) return;

    sounds.resume();
    sounds.playBGM();

    document.getElementById('game-start').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');

    arena = createMatrix(12, 20);

    player.score = 0;
    player.lines = 0;
    player.level = 1;
    dropInterval = 1000;
    isGameOver = false;
    isPaused = false;
    isAnimating = false;
    clearingRows = [];
    gameStarted = true;
    nextPiece = null;
    holdPiece = null;
    canHold = true;

    updateScore();
    drawHold();

    playerReset();
    update();
}

function resetGame() {
    gameStarted = false;
    isGameOver = false;
    cancelAnimationFrame(animationId);
    startGame();
}

function update(time = 0) {
    if (isPaused) {
        mascot.update(0, false);
        return;
    }

    if (isGameOver) {
        mascot.update(1, true);
        animationId = requestAnimationFrame(update); // Keep animating mascot
        return;
    }

    if (gameStarted) {
        mascot.update(calculateDangerLevel(), false);
    } else {
        mascot.update(0, false);
    }

    if (!gameStarted) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    if (isAnimating) {
        if (time - animationStartTime > ANIMATION_DURATION) {
            finalizeClear();
        }
    } else {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }

        // Lock Delay Calculation
        // Check if player is on ground
        player.pos.y++;
        if (collide(arena, player)) {
            lockDelay += deltaTime;
            if (lockDelay > LOCK_DELAY_LIMIT) {
                // Force drop/merge
                player.pos.y--; // restore
                playerDrop(); // calls collision logic -> merge
            }
        } else {
            lockDelay = 0; // In air
        }
        player.pos.y--; // Restore

    }
    draw();
    animationId = requestAnimationFrame(update);
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    } else {
        sounds.playMove();
        lockDelay = 0; // Reset lock delay on move (Infinity Rule-ish)
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    sounds.playRotate();
    lockDelay = 0; // Reset lock delay on rotate
}

// --- RE-ADD KEYBOARD CONTROLS ---
document.addEventListener('keydown', event => {
    if ([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1) {
        event.preventDefault();
    }

    if (!gameStarted) return;
    if (isGameOver) return;

    if (event.keyCode === 80) {
        togglePause();
    }

    if (isPaused) return;
    if (isAnimating) return;

    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 38) { // Rotate
        playerRotate(1);
    } else if (event.keyCode === 32) { // Hard Drop
        playerHardDrop();
    } else if (event.keyCode === 67) { // Hold
        playerHold();
    }
});
// --- MOBILE TOUCH CONTROLS ---
function setupMobileControls() {
    const bindBtn = (id, action) => {
        const btn = document.getElementById(id);
        if (!btn) {
            console.error('Mobile button not found:', id);
            return;
        }

        // Use 'pointerdown' for better cross-device support (mouse + touch)
        // This is modern standard and avoids ghost clicks
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // Stop default touch actions (scrolling/zoom)

            // Allow controls even if game is just starting or running
            if (isGameOver || isPaused) return;
            if (!gameStarted) return; // But must be started

            action();

            // Add visual feedback class
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 100);
        });
    };

    bindBtn('btn-left', () => playerMove(-1));
    bindBtn('btn-right', () => playerMove(1));
    bindBtn('btn-rotate', () => playerRotate(1));
    bindBtn('btn-down', () => playerDrop());
    bindBtn('btn-drop', () => playerHardDrop());
    bindBtn('btn-hold', () => playerHold());
}
setupMobileControls();

function togglePause() {
    if (isGameOver || !gameStarted) return;
    isPaused = !isPaused;

    const pauseScreen = document.getElementById('pause-screen');
    if (isPaused) {
        sounds.stopBGM();
        pauseScreen.classList.remove('hidden');
        cancelAnimationFrame(animationId);
    } else {
        sounds.playBGM();
        pauseScreen.classList.add('hidden');
        lastTime = performance.now();
        update();
    }
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', resetGame);
// --- SOUND INTEGRATION ---
document.getElementById('sound-btn').addEventListener('click', (e) => {
    const isMuted = sounds.toggleMute();
    e.target.innerText = isMuted ? '🔇 Sound Off' : '🔊 Sound On';
});

document.getElementById('music-style-btn').addEventListener('click', (e) => {
    const mode = sounds.toggleMode();
    // 'wav' is the default now (Real Music), 'cute' is the synth fallback
    e.target.innerText = mode === 'wav' ? '🎸 Real Music' : '😺 8-Bit';
});
document.getElementById('resume-btn').addEventListener('click', togglePause);
// --- DEV INFO MODAL ---
const devModal = document.getElementById('dev-modal');
document.getElementById('dev-info-btn').addEventListener('click', () => {
    // Only open if not playing or paused? Or always?
    // Let's allow always, it pauses game if playing
    if (gameStarted && !isPaused && !isGameOver) {
        togglePause();
    }
    devModal.classList.remove('hidden');
});

document.getElementById('close-dev-btn').addEventListener('click', () => {
    devModal.classList.add('hidden');
});
document.getElementById('lang-btn').addEventListener('click', toggleLanguage);

updateText();
draw();
