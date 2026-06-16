const firebaseConfig = {
    apiKey: "APP_API_KEY", 
    authDomain: "APP_AUTH_DOMAIN",
    databaseURL: "APP_DATABASE_URL",
    projectId: "APP_PROJECT_ID",
    storageBucket: "APP_STORAGE_BUCKET",
    messagingSenderId: "APP_SENDER_ID",
    appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let gameId = new URLSearchParams(window.location.search).get('g');
if (!gameId) {
    gameId = Math.random().toString(36).substring(2, 7);
    window.history.replaceState(null, null, `?g=${gameId}`);
}

const gRef = db.ref(`games/${gameId}`);
document.getElementById('game-link').value = window.location.href;

let role = null;
let state = { b: Array(9).fill(""), p: "X", h: [], w: null };

const cells = document.querySelectorAll('.cell');
const stText = document.getElementById('status');

gRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        state = data;
        render();
    } else {
        gRef.set(state);
    }
});

const localKey = `role_${gameId}`;
if (!localStorage.getItem(localKey)) {
    gRef.child('u').transaction((curr) => {
        if (!curr) { role = 'X'; return { x: 1 }; }
        if (!curr.o) { role = 'O'; return { ...curr, o: 1 }; }
        role = 'v'; return curr;
    }, () => {
        localStorage.setItem(localKey, role);
    });
} else {
    role = localStorage.getItem(localKey);
}

function render() {
    state.b.forEach((val, i) => {
        cells[i].innerText = val;
        cells[i].className = `cell ${val.toLowerCase()}`;
        if (state.h && state.h.length === 6 && state.h[0] === i) {
            cells[i].classList.add('oldest');
        }
    });

    if (state.w) {
        stText.innerText = state.w === 'D' ? "SYSTEM DRAW" : `VICTORY: PLAYER ${state.w}`;
        stText.style.color = state.w === 'X' ? 'var(--x-color)' : 'var(--o-color)';
    } else {
        const isMyTurn = (role === state.p);
        stText.innerText = isMyTurn ? `YOUR TURN (${state.p})` : `WAITING FOR ${state.p}...`;
        stText.style.color = 'var(--text)';
    }
}

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        const idx = parseInt(cell.dataset.index);
        
        if (state.b[idx] !== "" || state.w || role !== state.p) return;

        let newBoard = [...state.b];
        let newHistory = state.h ? [...state.h] : [];

        if (newHistory.length >= 6) {
            const toRemove = newHistory.shift();
            newBoard[toRemove] = "";
        }

        newBoard[idx] = state.p;
        newHistory.push(idx);

        const winner = checkWinner(newBoard);
        
        gRef.update({
            b: newBoard,
            h: newHistory,
            p: state.p === "X" ? "O" : "X",
            w: winner
        });
    });
});

function checkWinner(b) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (let l of lines) {
        if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return b[l[0]];
    }
    return null;
}

document.getElementById('restart').onclick = () => {
    gRef.update({ b: Array(9).fill(""), p: "X", h: [], w: null });
};

document.getElementById('copy-btn').onclick = () => {
    navigator.clipboard.writeText(window.location.href);
    const btn = document.getElementById('copy-btn');
    btn.innerText = "COPIED!";
    setTimeout(() => btn.innerText = "COPY LINK", 2000);
};
