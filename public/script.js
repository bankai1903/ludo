const socket = io();

// Game State
let gameState = {
    turn: 'RED',
    diceValue: 0,
    isRolling: false,
    players: {
        RED: { tokens: [0, 0, 0, 0] },
        YELLOW: { tokens: [0, 0, 0, 0] },
    },
    winner: null,
};

let myPlayerType = null;
let currentRoomId = null;

// DOM Elements
const landingPage = document.getElementById('landing-page');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');
const boardEl = document.getElementById('ludo-board');
const diceEl = document.getElementById('dice-3d');
const rollBtn = document.getElementById('roll-btn');
const messageBox = document.getElementById('message-box');
const roomIdDisplay = document.getElementById('room-id-display');
const playerRoleIndicator = document.getElementById('player-role-indicator');
const diceNumDisplay = document.getElementById('dice-number-display');

// SVG Token Template (Pin Style inspired by image)
const createTokenSVG = (player) => {
    const colors = {
        RED: '#ea2127',
        GREEN: '#11a24d',
        YELLOW: '#fff200',
        BLUE: '#00aeef'
    };
    const color = colors[player] || '#ea2127';
    return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 0 C22 0 0 22 0 50 C0 80 50 120 50 120 C50 120 100 80 100 50 C100 22 78 0 50 0 Z" fill="${color}" stroke="#000" stroke-width="2"/>
        <circle cx="50" cy="45" r="22" fill="white" />
        <circle cx="50" cy="45" r="12" fill="${color}" />
    </svg>`;
};

// Initialize Board (Matches image part by part)
function initBoard() {
    boardEl.innerHTML = '';
    
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            // Base Areas (Four quadrants)
            if (r < 6 && c < 6) cell.classList.add('base-red');
            if (r < 6 && c > 8) cell.classList.add('base-green');
            if (r > 8 && c > 8) cell.classList.add('base-yellow');
            if (r > 8 && c < 6) cell.classList.add('base-blue');

            // Set specific base layout as per image
            if (r === 0 && c === 0) {
                cell.style.gridColumn = '1 / span 6';
                cell.style.gridRow = '1 / span 6';
                cell.innerHTML = `<div class="base-inner">${'<div class="base-spot" style="border-color:var(--ludo-red)"></div>'.repeat(4)}</div>`;
            } else if (r === 0 && c === 9) {
                cell.style.gridColumn = '10 / span 6';
                cell.style.gridRow = '1 / span 6';
                cell.innerHTML = `<div class="base-inner">${'<div class="base-spot" style="border-color:var(--ludo-green)"></div>'.repeat(4)}</div>`;
            } else if (r === 9 && c === 9) {
                cell.style.gridColumn = '10 / span 6';
                cell.style.gridRow = '10 / span 6';
                cell.innerHTML = `<div class="base-inner">${'<div class="base-spot" style="border-color:var(--ludo-yellow)"></div>'.repeat(4)}</div>`;
            } else if (r === 9 && c === 0) {
                cell.style.gridColumn = '1 / span 6';
                cell.style.gridRow = '10 / span 6';
                cell.innerHTML = `<div class="base-inner">${'<div class="base-spot" style="border-color:var(--ludo-blue)"></div>'.repeat(4)}</div>`;
            } else if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c > 8) || (r > 8 && c < 6)) {
                continue; // Skip individual cells inside 6x6 bases
            }

            // Path indicators (Home Lanes)
            if (r === 7 && c > 0 && c < 6) cell.classList.add('track-red');
            if (c === 7 && r > 0 && r < 6) cell.classList.add('track-green');
            if (r === 7 && c > 8 && c < 14) cell.classList.add('track-yellow');
            if (c === 7 && r > 8 && r < 14) cell.classList.add('track-blue');

            // Safe Spots (Stars) & Arrows based on image
            const safeSpots = [
                { r: 8, c: 2, icon: '★', color: 'var(--ludo-red)' },
                { r: 2, c: 6, icon: '★', color: 'var(--ludo-green)' },
                { r: 6, c: 12, icon: '★', color: 'var(--ludo-yellow)' },
                { r: 12, c: 8, icon: '★', color: 'var(--ludo-blue)' }
            ];
            
            const spot = safeSpots.find(s => s.r === r && s.c === c);
            if (spot) cell.innerHTML = `<span class="star" style="color:${spot.color}">${spot.icon}</span>`;

            const entryArrows = [
                { r: 7, c: 2, icon: '→', color: 'var(--ludo-red)' },
                { r: 2, c: 7, icon: '↓', color: 'var(--ludo-green)' },
                { r: 7, c: 12, icon: '←', color: 'var(--ludo-yellow)' },
                { r: 12, c: 7, icon: '↑', color: 'var(--ludo-blue)' }
            ];
            const arrow = entryArrows.find(a => a.r === r && a.c === c);
            if (arrow) {
                cell.style.backgroundColor = arrow.color;
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.innerHTML = `<span class="arrow" style="color:#fff; font-size: 1.8rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3)">${arrow.icon}</span>`;
            }

            // Home Goal (Center 3x3)
            if (r === 6 && c === 6) {
                cell.style.gridColumn = '7 / span 3';
                cell.style.gridRow = '7 / span 3';
                cell.classList.add('home-goal');
                cell.innerHTML = `
                    <div class="home-goal-inner">
                        <div class="triangle tri-red"></div>
                        <div class="triangle tri-green"></div>
                        <div class="triangle tri-yellow"></div>
                        <div class="triangle tri-blue"></div>
                    </div>
                `;
            } else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
                continue;
            }

            boardEl.appendChild(cell);
        }
    }
}

// Constants
const TRACK_LENGTH = 52;
const HOME_EXIT_POS = 51;
const WINNING_POS = 58;

// Logic: More efficient coordinate mapping
const GRID_CONFIG = {
    TRACK: [
        [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], 
        [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
        [0, 7], [0, 8],
        [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
        [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
        [7, 14], [8, 14],
        [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
        [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
        [14, 7], [14, 6],
        [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
        [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
        [7, 0]
    ],
    BASE: {
        RED: [[1, 1], [1, 4], [4, 1], [4, 4]],
        YELLOW: [[10, 10], [10, 13], [13, 10], [13, 13]]
    },
    HOME_START: {
        RED: (pos) => [7, 1 + (pos - 53)],
        YELLOW: (pos) => [7, 13 - (pos - 53)]
    }
};

function getCoordinates(pos, player) {
    if (pos === 0) return GRID_CONFIG.BASE[player];
    
    if (pos >= 1 && pos <= TRACK_LENGTH) {
        const offset = player === 'RED' ? 0 : 26;
        return GRID_CONFIG.TRACK[(pos - 1 + offset) % TRACK_LENGTH];
    }

    if (pos >= 53 && pos <= 57) {
        return GRID_CONFIG.HOME_START[player](pos);
    }

    return [7, 7]; // Home Goal
}

function updateDiceUI(value, isRolling) {
    if (!diceEl || !diceNumDisplay) return;

    if (isRolling) {
        diceEl.classList.add('rolling');
        diceNumDisplay.textContent = '...';
    } else {
        diceEl.classList.remove('rolling');
        diceNumDisplay.textContent = value || '';
        
        const rotations = {
            1: 'rotateX(0deg) rotateY(0deg)',
            2: 'rotateX(90deg) rotateY(0deg)',
            3: 'rotateX(0deg) rotateY(-90deg)',
            4: 'rotateX(0deg) rotateY(90deg)',
            5: 'rotateX(-90deg) rotateY(0deg)',
            6: 'rotateX(0deg) rotateY(180deg)'
        };
        
        if (value && rotations[value]) {
            diceEl.style.transform = rotations[value];
        } else {
            diceEl.style.transform = 'rotateX(0deg) rotateY(0deg)';
        }
    }
}

function renderGameState() {
    if (gameState.isRolling) {
        updateDiceUI(gameState.diceValue, true);
    } else {
        updateDiceUI(gameState.diceValue, false);
    }

    const cellCounts = {};
    const cellWidth = 100 / 15;

    Object.entries(gameState.players).forEach(([pKey, pData]) => {
        pData.tokens.forEach((pos, idx) => {
            const tokenId = `token-${pKey}-${idx}`;
            let token = document.getElementById(tokenId);
            
            if (!token) {
                token = document.createElement('div');
                token.id = tokenId;
                token.className = `token ${pKey}`;
                token.innerHTML = createTokenSVG(pKey);
                boardEl.appendChild(token);
            }

            const coords = getCoordinates(pos, pKey);
            const [r, c] = pos === 0 ? coords[idx] : coords;
            
            const cellKey = `${r}-${c}`;
            cellCounts[cellKey] = (cellCounts[cellKey] || 0) + 1;
            const offset = (cellCounts[cellKey] - 1) * 2; 

            // Use percent-based positioning for smooth transitions on all screen sizes
            token.style.top = `calc(${r * cellWidth}% + ${offset}px)`;
            token.style.left = `calc(${c * cellWidth}% + ${offset}px)`;
            
            const isMyTurn = gameState.turn === myPlayerType && pKey === myPlayerType;
            const canMove = isMyTurn && gameState.diceValue !== 0 && isValidMove(pos, gameState.diceValue);
            
            token.classList.toggle('clickable', !!canMove);
            token.onclick = canMove ? () => moveToken(idx) : null;
        });
    });

    // Update Status
    ['RED', 'YELLOW'].forEach(color => {
        const el = document.getElementById(`status-${color.toLowerCase()}`);
        if (el) el.classList.toggle('active', gameState.turn === color);
    });

    rollBtn.disabled = gameState.turn !== myPlayerType || gameState.diceValue !== 0 || gameState.isRolling;

    if (gameState.winner) {
        messageBox.textContent = `🎉 ${gameState.winner} WINS!`;
        messageBox.className = 'winner-msg';
    }
}

function isValidMove(currPos, diceVal) {
    if (currPos === 0) return diceVal === 6;
    if (currPos === 58) return false;
    return currPos + diceVal <= 58;
}

function moveToken(idx) {
    if (!currentRoomId) return;
    
    const currentPos = gameState.players[myPlayerType].tokens[idx];
    let nextPos = currentPos === 0 ? 1 : currentPos + gameState.diceValue;

    // Predictive state for capture logic
    const opponent = myPlayerType === 'RED' ? 'YELLOW' : 'RED';
    const newPlayers = JSON.parse(JSON.stringify(gameState.players));
    newPlayers[myPlayerType].tokens[idx] = nextPos;

    let captured = false;
    const safePositions = [1, 9, 14, 22, 27, 35, 40, 48]; // Standard Ludo safe cells

    if (nextPos >= 1 && nextPos <= TRACK_LENGTH) {
        const getAbs = (p, pType) => (pType === 'RED' ? p : (p + 26 > TRACK_LENGTH ? p + 26 - TRACK_LENGTH : p + 26));
        const myAbs = getAbs(nextPos, myPlayerType);
        
        // Star cells are safe from capture
        const isSafe = safePositions.includes(nextPos);

        if (!isSafe) {
            newPlayers[opponent].tokens.forEach((oPos, oIdx) => {
                if (oPos >= 1 && oPos <= TRACK_LENGTH && getAbs(oPos, opponent) === myAbs) {
                    newPlayers[opponent].tokens[oIdx] = 0;
                    captured = true;
                }
            });
        }
    }

    let nextTurn = myPlayerType;
    // Turn continues if: rolled a 6 OR captured a token OR reached home goal
    if (gameState.diceValue !== 6 && !captured && nextPos !== 58) {
        nextTurn = opponent;
    }

    const newState = {
        ...gameState,
        players: newPlayers,
        turn: nextTurn,
        diceValue: 0,
        winner: newPlayers[myPlayerType].tokens.every(p => p === 58) ? myPlayerType : null
    };

    // Optimistic Update: Update locally immediately for responsiveness
    gameState = newState;
    renderGameState();
    messageBox.textContent = `Moving...`;

    socket.emit('game-state-update', { roomId: currentRoomId, newState });
}

// Socket Events
socket.on('room-joined', ({ roomId, playerType }) => {
    currentRoomId = roomId;
    myPlayerType = playerType;
    landingPage.classList.add('hidden');
    waitingScreen.classList.remove('hidden');
    roomIdDisplay.textContent = roomId;
    playerRoleIndicator.textContent = `YOU ARE ${playerType}`;
});

socket.on('start-game', () => {
    waitingScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    initBoard();
    renderGameState();
    messageBox.textContent = "Game started! Red goes first.";
});

socket.on('game-state-sync', (newState) => {
    gameState = newState;
    messageBox.textContent = `${gameState.turn}'s turn`;
    renderGameState();
});

socket.on('error', (err) => alert(err));

// User Interactions
document.getElementById('create-room-btn').onclick = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit('create-room', { roomId: id });
};

document.getElementById('join-room-btn').onclick = () => {
    const id = document.getElementById('join-room-input').value.toUpperCase();
    if (id) socket.emit('join-room', { roomId: id });
};

rollBtn.onclick = () => {
    if (gameState.turn !== myPlayerType || gameState.diceValue !== 0) return;

    gameState.isRolling = true;
    socket.emit('game-state-update', { roomId: currentRoomId, newState: gameState });
    renderGameState();

    setTimeout(() => {
        const val = Math.floor(Math.random() * 6) + 1;
        gameState.diceValue = val;
        gameState.isRolling = false;
        renderGameState(); // Update dice animation immediately

        const tokens = gameState.players[myPlayerType].tokens;
        const canMove = tokens.some(p => isValidMove(p, val));

        if (!canMove && val !== 6) {
            messageBox.textContent = `You rolled a ${val}. No moves! Switching turn...`;
            setTimeout(() => {
                const nextTurn = (myPlayerType === 'RED' ? 'YELLOW' : 'RED');
                gameState.turn = nextTurn;
                gameState.diceValue = 0;
                socket.emit('game-state-update', { roomId: currentRoomId, newState: gameState });
                renderGameState();
            }, 1500);
        } else {
            messageBox.textContent = `You rolled a ${val}! Choose a token to move.`;
            socket.emit('game-state-update', { roomId: currentRoomId, newState: gameState });
            renderGameState();
        }
    }, 1500); // 1.5s animation
};

initBoard();
