/**
 * game.js — Chess Online: universal game controller
 * Works for both /game (vs player) and /game-bot (vs bot) pages.
 */

// ─── Constants ───────────────────────────────────────────────
// Inline SVG chess pieces — no external files needed
const PIECE_SVG = {
    // White pieces
    'K': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-width="2"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-width="1.5" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s.5-1.5-2-1.5-2 1.5-2 1.5v6.5c-2.5-7.5-12-10.5-16-4-3 6 5 10 5 10v7z"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="none" stroke="#000"/></g></svg>`,
    'Q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M9 26c8.5-8.5 15.5-8.5 27 0l2.5-12.5L31 25l-.3-14.1-8.2 13.4-8.2-13.4L14 25 6.5 13.5z" stroke-linejoin="miter"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5 1.5-18.5 1.5-27 0z"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke="#000"/></g></svg>`,
    'R': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-2-22V9h4v2h5V9h5v2h5V9h4v5" stroke-linejoin="miter"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none"/></g></svg>`,
    'B': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" fill="none" stroke="#000" stroke-linejoin="miter"/></g></svg>`,
    'N': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 5.12-1.05 8.9-5 9.5-4.95.62-6.5-3.5-6-7.5" fill="#fff"/><path d="M9.5 25.5a1 1 0 1 0 2 0 1 1 0 1 0-2 0z" fill="#000"/><path d="M14.933 15.75c-.315 1.377.485 2.667 1.8 3 1.316.333 2.633-.5 2.967-1.833.333-1.333-.5-2.667-1.833-3-1.317-.333-2.617.5-2.934 1.833z" fill="#000"/></g></svg>`,
    'P': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    // Black pieces
    'k': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke="#fff" stroke-width="2"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s.5-1.5-2-1.5-2 1.5-2 1.5v6.5c-2.5-7.5-12-10.5-16-4-3 6 5 10 5 10v7z"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="none" stroke="#fff"/></g></svg>`,
    'q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M9 26c8.5-8.5 15.5-8.5 27 0l2.5-12.5L31 25l-.3-14.1-8.2 13.4-8.2-13.4L14 25 6.5 13.5z" stroke-linejoin="miter"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5 1.5-18.5 1.5-27 0z"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke="#fff"/></g></svg>`,
    'r': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5-4v-13h21v13H12z"/><path d="M14 29.5v-13h17v13H14z" fill="#000"/><path d="M9 9l3 3h21l3-3H9zM9 9v4h27V9" stroke-linejoin="miter"/><path d="M12 12h1M14 12h1M16 12h1M18 12h1M20 12h1M22 12h1M24 12h1M26 12h1M28 12h1M30 12h1M32 12h1" fill="none" stroke="#fff"/><path d="M11 14h23" fill="none" stroke="#fff"/></g></svg>`,
    'b': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" fill="none" stroke="#fff" stroke-linejoin="miter"/></g></svg>`,
    'n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 5.12-1.05 8.9-5 9.5-4.95.62-6.5-3.5-6-7.5"/><path d="M9.5 25.5a1 1 0 1 0 2 0 1 1 0 1 0-2 0z" fill="#fff"/><path d="M14.933 15.75c-.315 1.377.485 2.667 1.8 3 1.316.333 2.633-.5 2.967-1.833.333-1.333-.5-2.667-1.833-3-1.317-.333-2.617.5-2.934 1.833z" fill="#fff"/></g></svg>`,
    'p': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

const SQUARE_LIGHT = '#b0b0b0';
const SQUARE_DARK  = '#5c5c5c';
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
            if (piece && PIECE_SVG[piece]) {
                const pieceEl = document.createElement('div');
                pieceEl.className = 'piece';
                pieceEl.innerHTML = PIECE_SVG[piece];
                const svg = pieceEl.querySelector('svg');
                if (svg) {
                    svg.style.width = '100%';
                    svg.style.height = '100%';
                    svg.style.display = 'block';
                    svg.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))';
                }
                cell.appendChild(pieceEl);
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
                lbl.className = 'coord-rank';
                lbl.textContent = rank;
                cell.appendChild(lbl);
            }
            // File label (bottom edge)
            if (ri === 7) {
                const lbl = document.createElement('span');
                lbl.className = 'coord-file';
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
