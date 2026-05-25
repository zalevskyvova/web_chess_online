/**
 * game.js — Chess Online: universal game controller
 * Works for both /game (vs player) and /game-bot (vs bot) pages.
 */

// ─── Constants ───────────────────────────────────────────────
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

const SQUARE_LIGHT = '#b8bcbe';
const SQUARE_DARK  = '#4e5254';
const SELECTED_COLOR  = 'rgba(20,85,30,0.5)';
const LAST_MOVE_COLOR = 'rgba(155,199,0,0.4)';
const CHECK_COLOR     = 'rgba(220,30,30,0.55)';
const LEGAL_DOT_COLOR = 'rgba(20,85,30,0.35)';

// ─── State ───────────────────────────────────────────────────
let roomId       = null;
let playerColor  = null;   // 'white' | 'black'
let isBot        = false;
let selectedSq   = null;   // e.g. 'e2'
let boardFEN     = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let legalMoves   = [];     // squares reachable from selected piece
let lastMove     = null;   // {from, to}
let gameOver     = false;
let pollInterval = null;
let wTimer       = 0;
let bTimer       = 0;
let timerInterval = null;
let currentTurn  = 'White'; // whose turn it is
window.hasGuest  = false;

// ─── Setup modal ─────────────────────────────────────────────
function initSetupModal() {
    isBot = window.location.pathname.includes('bot');

    const modal = document.getElementById('setupModal');
    const form  = document.getElementById('setupForm');
    const diffRow = document.getElementById('difficultyRow');

    if (isBot) {
        diffRow.style.display = 'flex';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createRoom();
    });
}

async function createRoom() {
    const timeControl = document.getElementById('timeControl').value;
    const color       = document.getElementById('colorSelect').value;
    const body = {
        time_control: timeControl,
        against: isBot ? 'bot' : 'player',
        color,
    };
    if (isBot) {
        body.difficulty = document.getElementById('difficulty').value;
    }

    // Reset per-game flags
    window._timersSwapped = false;
    window.hasGuest = false;

    try {
        const data = await Auth.post('/create-room', body);
        roomId      = data.room_id;
        playerColor = data.color;

        document.getElementById('setupModal').style.display = 'none';
        document.getElementById('gameArea').style.display   = 'flex';

        if (!isBot) {
            document.getElementById('roomInfo').textContent = roomId;
            document.getElementById('roomInfoBox').style.display = 'flex';
        }

        // Initial board fetch (already calls fetchLegalMoves internally)
        await fetchBoard();
        renderBoard();
        renderTimers();
        startPolling();
        startTimerTick();
    } catch (err) {
        showToast('Помилка створення кімнати', 'error');
    }
}

// ─── API helpers ─────────────────────────────────────────────
async function fetchBoard() {
    try {
        const data = await Auth.post('/board', { room_id: roomId });
        updateState(data);
        await fetchLegalMoves();
        renderBoard();
        renderTimers();
    } catch (e) {}
}

async function sendMove(uci) {
    const isWhite = playerColor === 'white';
    try {
        const data = await Auth.post('/move', {
            move: uci,
            color: isWhite,
            room_id: roomId
        });

        if (isBot && typeof data.success === 'string') {
            // Bot responded with bot's move UCI
            lastMove = { from: data.success.slice(0, 2), to: data.success.slice(2, 4) };
        }

        updateState(data);
        await fetchLegalMoves();
        renderBoard();
        renderTimers();

        if (data.status === 'checkmate' || data.status === 'stalemate' || data.status === 'game end') {
            handleGameOver(data.status);
        }
    } catch (e) {
        showToast('Хід не зараховано', 'error');
    }
}

// ─── State update ─────────────────────────────────────────────
function updateState(data) {
    if (data.current_FEN) boardFEN = data.current_FEN;
    if (data.w_timer !== undefined) wTimer = data.w_timer;
    if (data.b_timer !== undefined) bTimer = data.b_timer;
    if (data.turn)   currentTurn = data.turn;
    if (data.move_history !== undefined) updateMoveHistory(data.move_history);
    if (data.has_guest !== undefined) window.hasGuest = data.has_guest;

    const status = data.status;
    if (status === 'checkmate' || status === 'stalemate' || status === 'game end') {
        handleGameOver(status);
    }

    // Track last move from FEN if not already set via bot move
    if (data.success && typeof data.success === 'string' && data.success.length >= 4) {
        lastMove = { from: data.success.slice(0, 2), to: data.success.slice(2, 4) };
    }
}

// ─── Board rendering ──────────────────────────────────────────
function renderBoard() {
    const board = document.getElementById('chessboard');
    board.innerHTML = '';

    const ranks = ['8','7','6','5','4','3','2','1'];
    const files = ['a','b','c','d','e','f','g','h'];

    const displayRanks = playerColor === 'black' ? [...ranks].reverse() : ranks;
    const displayFiles = playerColor === 'black' ? [...files].reverse() : files;

    // Parse FEN into piece map
    const pieceMap = parseFEN(boardFEN);

    // Compute legal moves from selected square
    const legalDests = selectedSq ? computeLegalMoves(selectedSq, boardFEN) : [];

    // Check square (king in check)
    const inCheck = boardFEN.split(' ')[1] === (playerColor === 'white' ? 'w' : 'b')
                 && isKingInCheck(boardFEN);
    const checkSq = inCheck ? findKing(boardFEN, currentTurn) : null;

    displayRanks.forEach((rank, ri) => {
        displayFiles.forEach((file, fi) => {
            const sq = file + rank;
            const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0;

            const cell = document.createElement('div');
            cell.className = 'sq';
            cell.dataset.sq = sq;

            // Base color
            cell.style.background = isLight ? SQUARE_LIGHT : SQUARE_DARK;

            // Last move highlight
            if (lastMove && (sq === lastMove.from || sq === lastMove.to)) {
                cell.style.background = LAST_MOVE_COLOR;
            }

            // Selected highlight
            if (sq === selectedSq) {
                cell.style.background = SELECTED_COLOR;
            }

            // Check highlight
            if (sq === checkSq) {
                cell.style.background = CHECK_COLOR;
            }

            // Piece
            const piece = pieceMap[sq];
            if (piece) {
                const img = document.createElement('img');
                img.className = 'piece-img';
                
                // Map piece code to file name
                let colorPrefix = piece === piece.toUpperCase() ? 'w' : 'b';
                let pieceType = piece.toUpperCase();
                img.src = `/static/images/pieces/${colorPrefix}${pieceType}.png`;
                img.alt = piece;
                img.draggable = false;
                cell.appendChild(img);
            }

            // Legal move dot
            if (legalDests.includes(sq)) {
                const dot = document.createElement('div');
                dot.className = pieceMap[sq] ? 'capture-ring' : 'move-dot';
                cell.appendChild(dot);
            }

            // Rank label (left edge)
            if (fi === 0) {
                const lbl = document.createElement('span');
                lbl.className = 'coord-rank ' + (isLight ? 'coord-on-light' : 'coord-on-dark');
                lbl.textContent = rank;
                cell.appendChild(lbl);
            }
            // File label (bottom edge)
            if (ri === 7) {
                const lbl = document.createElement('span');
                lbl.className = 'coord-file ' + (isLight ? 'coord-on-light' : 'coord-on-dark');
                lbl.textContent = file;
                cell.appendChild(lbl);
            }

            cell.addEventListener('click', () => handleSquareClick(sq));
            board.appendChild(cell);
        });
    });
}

// ─── Click handling ───────────────────────────────────────────
function handleSquareClick(sq) {
    if (gameOver) return;
    if (currentTurn !== capitalize(playerColor)) return; // Not our turn

    const pieceMap = parseFEN(boardFEN);
    const piece = pieceMap[sq];

    // If nothing selected yet
    if (!selectedSq) {
        if (!piece) return;
        const isWhitePiece = piece === piece.toUpperCase();
        if (playerColor === 'white' && !isWhitePiece) return;
        if (playerColor === 'black' && isWhitePiece) return;
        selectedSq = sq;
        renderBoard();
        return;
    }

    // If clicked same square — deselect
    if (sq === selectedSq) {
        selectedSq = null;
        renderBoard();
        return;
    }

    // If clicked own piece — reselect
    const isWhitePiece = piece && piece === piece.toUpperCase();
    const isOurPiece = piece && (
        (playerColor === 'white' && isWhitePiece) ||
        (playerColor === 'black' && !isWhitePiece)
    );
    if (isOurPiece) {
        selectedSq = sq;
        renderBoard();
        return;
    }

    // Try move
    const legalDests = computeLegalMoves(selectedSq, boardFEN);
    if (!legalDests.includes(sq)) {
        selectedSq = null;
        renderBoard();
        return;
    }

    // Build UCI — handle promotion
    let uci = selectedSq + sq;
    const movingPiece = pieceMap[selectedSq];
    const isPawn = movingPiece && movingPiece.toLowerCase() === 'p';
    const promotionRank = playerColor === 'white' ? '8' : '1';
    if (isPawn && sq[1] === promotionRank) {
        uci += 'q'; // auto-promote to queen
    }

    lastMove = { from: selectedSq, to: sq };
    selectedSq = null;
    sendMove(uci);
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── FEN parser ───────────────────────────────────────────────
function parseFEN(fen) {
    const map = {};
    const board = fen.split(' ')[0];
    const rows = board.split('/');
    const ranks = ['8','7','6','5','4','3','2','1'];
    const files = ['a','b','c','d','e','f','g','h'];

    rows.forEach((row, ri) => {
        let fi = 0;
        for (const ch of row) {
            if (ch >= '1' && ch <= '8') {
                fi += parseInt(ch);
            } else {
                map[files[fi] + ranks[ri]] = ch;
                fi++;
            }
        }
    });
    return map;
}

// ─── Pseudo-legal move generator (client-side) ────────────────
function computeLegalMoves(fromSq, fen) {
    // We delegate to backend via cached legal moves if available.
    // For now, use a pre-fetched set (updated on each board fetch).
    return window._legalMoves ? (window._legalMoves[fromSq] || []) : [];
}

async function fetchLegalMoves() {
    // Ask server for all legal moves in current position
    try {
        const data = await Auth.post('/legal-moves', { room_id: roomId });
        window._legalMoves = data.moves || {};
    } catch (e) {
        window._legalMoves = {};
    }
}

// ─── Check detection helpers ──────────────────────────────────
function isKingInCheck(fen) {
    return fen.includes('+') || false; // simple heuristic; real check comes from status
}

function findKing(fen, turn) {
    const map = parseFEN(fen);
    const kingChar = turn === 'White' ? 'K' : 'k';
    for (const [sq, piece] of Object.entries(map)) {
        if (piece === kingChar) return sq;
    }
    return null;
}

// ─── Timers ───────────────────────────────────────────────────
function startTimerTick() {
    // Clear any existing timer to prevent duplicates
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameOver) return;
        if (currentTurn === 'White') {
            wTimer = Math.max(0, wTimer - 1);
        } else {
            bTimer = Math.max(0, bTimer - 1);
        }
        renderTimers();

        if (wTimer <= 0 || bTimer <= 0) {
            handleGameOver('timeout');
        }
    }, 1000);
}

function renderTimers() {
    const wEl = document.getElementById('timerWhite');
    const bEl = document.getElementById('timerBlack');
    if (wEl) wEl.textContent = formatTime(wTimer);
    if (bEl) bEl.textContent = formatTime(bTimer);

    // Highlight active timer
    if (wEl) wEl.classList.toggle('timer-active', currentTurn === 'White');
    if (bEl) bEl.classList.toggle('timer-active', currentTurn === 'Black');
    if (wEl) wEl.classList.toggle('timer-low', wTimer <= 10);
    if (bEl) bEl.classList.toggle('timer-low', bTimer <= 10);
}

function formatTime(seconds) {
    if (seconds >= 3600) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ─── Polling (vs player) ──────────────────────────────────────
function startPolling() {
    if (isBot) return; // bot moves come synchronously
    // Clear any existing poll to prevent duplicates
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        if (gameOver) { clearInterval(pollInterval); return; }
        await fetchBoard();
        renderBoard();
        renderTimers();
    }, 1500);
}

// ─── Move history ─────────────────────────────────────────────
function updateMoveHistory(pgn) {
    const el = document.getElementById('moveList');
    if (!el) return;
    el.innerHTML = '';
    if (!pgn) return;

    const tokens = pgn.trim().split(/\s+/);
    let html = '';
    let moveNum = '';

    tokens.forEach(tok => {
        if (/^\d+\./.test(tok)) {
            moveNum = tok;
            html += `<span class="move-num">${tok}</span> `;
        } else {
            html += `<span class="move-token">${tok}</span> `;
        }
    });
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
}

// ─── Game Over ────────────────────────────────────────────────
function handleGameOver(reason) {
    if (gameOver) return;
    gameOver = true;
    clearInterval(pollInterval);
    clearInterval(timerInterval);

    let msg = '';
    if (reason === 'checkmate') {
        const winner = currentTurn === 'White' ? 'Чорні' : 'Білі';
        msg = `Шах і мат! ${winner} перемогли 🏆`;
    } else if (reason === 'stalemate') {
        msg = 'Пат! Нічия 🤝';
    } else if (reason === 'game end') {
        msg = 'Гра завершена 🤝';
    } else if (reason === 'timeout') {
        msg = 'Час вийшов! ⏰';
    } else if (reason === 'resigned') {
        msg = 'Ви здалися. Суперник переміг.';
    } else if (reason === 'draw') {
        msg = 'Нічия за згодою сторін 🤝';
    }

    showGameOverModal(msg);
}

function showGameOverModal(msg) {
    const overlay = document.getElementById('gameOverOverlay');
    const msgEl   = document.getElementById('gameOverMsg');
    if (overlay && msgEl) {
        msgEl.textContent = msg;
        overlay.style.display = 'flex';
    }
}

// ─── Resign / Draw ────────────────────────────────────────────
async function handleResign() {
    if (gameOver) return;
    if (!confirm('Ви впевнені, що хочете здатися?')) return;
    try {
        await Auth.post('/resign', {
            room_id: roomId,
            turn: playerColor === 'white'
        });
        handleGameOver('resigned');
    } catch (e) {}
}

async function handleDraw() {
    if (gameOver) return;
    try {
        const data = await Auth.post('/draw', {
            room_id: roomId,
            turn: playerColor === 'white',
            accept: true
        });
        if (data.status === 'draw') {
            handleGameOver('draw');
        } else if (data.status === 'draw_offered') {
            showToast('Пропозиція нічиєї відправлена', 'info');
        } else if (data.status === 'draw_declined') {
            showToast('Суперник відхилив нічию', 'warning');
        }
    } catch (e) {}
}

// ─── Toast notifications ──────────────────────────────────────
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();
    initSetupModal();
});
