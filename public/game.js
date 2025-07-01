const socket = io();

let currentGame = null;
let playerChoice = null;
let playerAvatar = null;
let playerId = null;

const screens = {
    setup: document.getElementById('setup-screen'),
    lobby: document.getElementById('lobby-screen'),
    waiting: document.getElementById('waiting-screen'),
    game: document.getElementById('game-screen'),
    gameOver: document.getElementById('game-over-screen'),
    disconnected: document.getElementById('disconnected-screen')
};

const elements = {
    // Setup screen
    emojiButtons: document.querySelectorAll('.emoji-btn'),
    selectedAvatar: document.getElementById('selected-avatar'),
    playerAvatarDisplay: document.getElementById('player-avatar'),
    continueBtn: document.getElementById('continue-btn'),
    
    // Lobby screen
    lobbyPlayerAvatar: document.getElementById('lobby-player-avatar'),
    playerIdDisplay: document.getElementById('player-id'),
    findGameBtn: document.getElementById('find-game-btn'),
    createRoomBtn: document.getElementById('create-room-btn'),
    joinRoomBtn: document.getElementById('join-room-btn'),
    roomCodeInput: document.getElementById('room-code-input'),
    roomInfo: document.getElementById('room-info'),
    roomCodeDisplay: document.getElementById('room-code-display'),
    cancelRoomBtn: document.getElementById('cancel-room-btn'),
    onlinePlayersList: document.getElementById('online-players-list'),
    
    // Waiting screen
    cancelWaitingBtn: document.getElementById('cancel-waiting-btn'),
    
    // Game screen
    gamePlayerAvatar: document.getElementById('game-player-avatar'),
    gameOpponentAvatar: document.getElementById('game-opponent-avatar'),
    playerScore: document.getElementById('player-score'),
    opponentScore: document.getElementById('opponent-score'),
    roundNumber: document.getElementById('round-number'),
    choicesArea: document.getElementById('choices-area'),
    waitingForOpponent: document.getElementById('waiting-for-opponent'),
    roundResult: document.getElementById('round-result'),
    playerChoiceResult: document.getElementById('player-choice-result'),
    opponentChoiceResult: document.getElementById('opponent-choice-result'),
    roundWinner: document.getElementById('round-winner'),
    
    // Game over screen
    gameResult: document.getElementById('game-result'),
    finalPlayerScore: document.getElementById('final-player-score'),
    finalOpponentScore: document.getElementById('final-opponent-score'),
    playAgainBtn: document.getElementById('play-again-btn'),
    
    // Disconnected screen
    returnHomeBtn: document.getElementById('return-home-btn')
};

const choiceEmojis = {
    rock: '✊',
    paper: '✋',
    scissors: '✌️'
};

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

function resetGame() {
    currentGame = null;
    playerChoice = null;
    elements.playerScore.textContent = '0';
    elements.opponentScore.textContent = '0';
    elements.roundNumber.textContent = '1';
    elements.choicesArea.classList.remove('hidden');
    elements.waitingForOpponent.classList.add('hidden');
    elements.roundResult.classList.add('hidden');
    showScreen('lobby');
}

// Setup screen
elements.emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.emojiButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        playerAvatar = btn.dataset.emoji;
        elements.playerAvatarDisplay.textContent = playerAvatar;
        elements.selectedAvatar.classList.remove('hidden');
    });
});

elements.continueBtn.addEventListener('click', () => {
    if (playerAvatar) {
        socket.emit('setAvatar', playerAvatar);
    }
});

// Lobby screen
elements.findGameBtn.addEventListener('click', () => {
    showScreen('waiting');
    socket.emit('findGame');
});

elements.createRoomBtn.addEventListener('click', () => {
    socket.emit('createRoom');
    elements.createRoomBtn.parentElement.classList.add('hidden');
    elements.roomInfo.classList.remove('hidden');
});

elements.joinRoomBtn.addEventListener('click', () => {
    const roomCode = elements.roomCodeInput.value.toUpperCase();
    if (roomCode.length === 6) {
        socket.emit('joinRoom', roomCode);
        showScreen('waiting');
    }
});

elements.cancelRoomBtn.addEventListener('click', () => {
    const roomCode = elements.roomCodeDisplay.textContent;
    socket.emit('cancelRoom', roomCode);
    elements.createRoomBtn.parentElement.classList.remove('hidden');
    elements.roomInfo.classList.add('hidden');
});

elements.cancelWaitingBtn.addEventListener('click', () => {
    socket.emit('cancelWaiting');
    showScreen('lobby');
});

// Game screen
document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!currentGame || playerChoice) return;
        
        playerChoice = btn.dataset.choice;
        elements.choicesArea.classList.add('hidden');
        elements.waitingForOpponent.classList.remove('hidden');
        
        socket.emit('makeChoice', {
            gameId: currentGame.gameId,
            choice: playerChoice
        });
    });
});

elements.playAgainBtn.addEventListener('click', resetGame);
elements.returnHomeBtn.addEventListener('click', resetGame);

// Socket events
socket.on('avatarSet', (data) => {
    playerId = data.id;
    elements.lobbyPlayerAvatar.textContent = playerAvatar;
    elements.playerIdDisplay.textContent = `Player ID: ${data.id.substring(0, 6)}`;
    showScreen('lobby');
});

socket.on('onlinePlayersUpdate', (players) => {
    elements.onlinePlayersList.innerHTML = '';
    
    if (players.length === 0) {
        elements.onlinePlayersList.innerHTML = '<p style="color: #999;">No other players online</p>';
        return;
    }
    
    players.forEach(player => {
        if (player.id !== playerId) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'online-player';
            playerDiv.innerHTML = `
                <div class="online-player-info">
                    <span class="online-player-avatar">${player.avatar}</span>
                    <span>${player.id.substring(0, 6)}</span>
                </div>
                <button class="btn btn-secondary challenge-btn" data-player-id="${player.id}">Challenge</button>
            `;
            
            playerDiv.querySelector('.challenge-btn').addEventListener('click', () => {
                socket.emit('challengePlayer', player.id);
                showScreen('waiting');
            });
            
            elements.onlinePlayersList.appendChild(playerDiv);
        }
    });
});

socket.on('roomCreated', (data) => {
    elements.roomCodeDisplay.textContent = data.roomCode;
});

socket.on('roomError', (data) => {
    alert(data.message);
    elements.roomCodeInput.value = '';
});

socket.on('challengeReceived', (data) => {
    if (confirm(`${data.challengerAvatar} wants to challenge you! Accept?`)) {
        socket.emit('acceptChallenge', data.challengerId);
    }
});

socket.on('challengeError', (data) => {
    alert(data.message);
    showScreen('lobby');
});

socket.on('waiting', () => {
    console.log('Waiting for opponent...');
});

socket.on('gameFound', (game) => {
    currentGame = game;
    const opponent = game.players.find(p => p.id !== socket.id);
    
    elements.gamePlayerAvatar.textContent = playerAvatar;
    elements.gameOpponentAvatar.textContent = opponent.avatar;
    
    showScreen('game');
    elements.choicesArea.classList.remove('hidden');
    elements.waitingForOpponent.classList.add('hidden');
    elements.roundResult.classList.add('hidden');
});

socket.on('roundResult', (result) => {
    const isPlayer1 = currentGame.players[0].id === socket.id;
    const playerScore = isPlayer1 ? result.scores[currentGame.players[0].id] : result.scores[currentGame.players[1].id];
    const opponentScore = isPlayer1 ? result.scores[currentGame.players[1].id] : result.scores[currentGame.players[0].id];
    
    elements.playerScore.textContent = playerScore;
    elements.opponentScore.textContent = opponentScore;
    
    const playerChoiceDisplay = result.choices[socket.id];
    const opponentId = currentGame.players.find(p => p.id !== socket.id).id;
    const opponentChoiceDisplay = result.choices[opponentId];
    
    elements.playerChoiceResult.textContent = choiceEmojis[playerChoiceDisplay];
    elements.opponentChoiceResult.textContent = choiceEmojis[opponentChoiceDisplay];
    
    if (!result.winner) {
        elements.roundWinner.textContent = "It's a tie!";
        elements.roundWinner.className = 'tie';
    } else if (result.winner === socket.id) {
        elements.roundWinner.textContent = 'You win this round!';
        elements.roundWinner.className = 'win';
    } else {
        elements.roundWinner.textContent = 'You lose this round!';
        elements.roundWinner.className = 'lose';
    }
    
    elements.waitingForOpponent.classList.add('hidden');
    elements.roundResult.classList.remove('hidden');
});

socket.on('nextRound', (data) => {
    playerChoice = null;
    elements.roundNumber.textContent = data.round;
    elements.choicesArea.classList.remove('hidden');
    elements.roundResult.classList.add('hidden');
});

socket.on('gameOver', (result) => {
    const isWinner = result.winner === socket.id;
    const isPlayer1 = currentGame.players[0].id === socket.id;
    const playerScore = isPlayer1 ? result.scores[currentGame.players[0].id] : result.scores[currentGame.players[1].id];
    const opponentScore = isPlayer1 ? result.scores[currentGame.players[1].id] : result.scores[currentGame.players[0].id];
    
    elements.gameResult.textContent = isWinner ? '🎉 You Win! 🎉' : 'You Lose';
    elements.gameResult.className = isWinner ? 'win' : 'lose';
    elements.finalPlayerScore.textContent = playerScore;
    elements.finalOpponentScore.textContent = opponentScore;
    
    showScreen('gameOver');
});

socket.on('playerDisconnected', () => {
    showScreen('disconnected');
});