const socket = io();

let currentGame = null;
let playerChoice = null;
let playerAvatar = localStorage.getItem('playerAvatar') || null;
let playerName = localStorage.getItem('playerName') || null;
let playerId = null;
let countdownInterval = null;
let choiceTimeout = null;
let selectedGameMode = '3';
let playerStats = JSON.parse(localStorage.getItem('playerStats')) || {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    rockCount: 0,
    paperCount: 0,
    scissorsCount: 0
};

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
    playerNameInput: document.getElementById('player-name-input'),
    emojiButtons: document.querySelectorAll('.emoji-btn'),
    selectedProfile: document.getElementById('selected-profile'),
    selectedName: document.getElementById('selected-name'),
    playerAvatarDisplay: document.getElementById('player-avatar'),
    continueBtn: document.getElementById('continue-btn'),
    
    // Lobby screen
    lobbyPlayerAvatar: document.getElementById('lobby-player-avatar'),
    lobbyPlayerName: document.getElementById('lobby-player-name'),
    editProfileBtn: document.getElementById('edit-profile-btn'),
    modeButtons: document.querySelectorAll('.mode-btn'),
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
    timerDisplay: document.getElementById('timer-display'),
    countdownTimer: document.querySelector('.countdown-timer'),
    gamePlayerAvatar: document.getElementById('game-player-avatar'),
    gamePlayerName: document.getElementById('game-player-name'),
    gameOpponentAvatar: document.getElementById('game-opponent-avatar'),
    gameOpponentName: document.getElementById('game-opponent-name'),
    playerScore: document.getElementById('player-score'),
    opponentScore: document.getElementById('opponent-score'),
    roundNumber: document.getElementById('round-number'),
    choicesArea: document.getElementById('choices-area'),
    waitingForOpponent: document.getElementById('waiting-for-opponent'),
    roundResult: document.getElementById('round-result'),
    playerChoiceResult: document.getElementById('player-choice-result'),
    opponentChoiceResult: document.getElementById('opponent-choice-result'),
    roundWinner: document.getElementById('round-winner'),
    nextRoundBtn: document.getElementById('next-round-btn'),
    waitingForNext: document.getElementById('waiting-for-next'),
    
    // Game over screen
    confettiContainer: document.getElementById('confetti-container'),
    gameResult: document.getElementById('game-result'),
    finalPlayerScore: document.getElementById('final-player-score'),
    finalOpponentScore: document.getElementById('final-opponent-score'),
    rematchBtn: document.getElementById('rematch-btn'),
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

// Check if user already has profile
if (playerAvatar && playerName) {
    socket.emit('setProfile', { avatar: playerAvatar, name: playerName, gameMode: selectedGameMode });
} else {
    // Pre-fill saved name if exists
    if (playerName) {
        elements.playerNameInput.value = playerName;
    }
}

// Debug: Check if elements are found
console.log('Continue button found:', !!elements.continueBtn);
console.log('Name input found:', !!elements.playerNameInput);

function createConfetti() {
    elements.confettiContainer.innerHTML = '';
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 3 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        elements.confettiContainer.appendChild(confetti);
    }
    
    setTimeout(() => {
        elements.confettiContainer.innerHTML = '';
    }, 5000);
}

function updateStats(won, choice) {
    playerStats.gamesPlayed++;
    if (won) {
        playerStats.wins++;
    } else {
        playerStats.losses++;
    }
    
    if (choice === 'rock') playerStats.rockCount++;
    else if (choice === 'paper') playerStats.paperCount++;
    else if (choice === 'scissors') playerStats.scissorsCount++;
    
    localStorage.setItem('playerStats', JSON.stringify(playerStats));
}

function resetGame() {
    currentGame = null;
    playerChoice = null;
    clearInterval(countdownInterval);
    clearTimeout(choiceTimeout);
    elements.playerScore.textContent = '0';
    elements.opponentScore.textContent = '0';
    elements.roundNumber.textContent = '1';
    elements.choicesArea.classList.remove('hidden');
    elements.waitingForOpponent.classList.add('hidden');
    elements.roundResult.classList.add('hidden');
    showScreen('lobby');
}


function startChoiceTimer() {
    let timeLeft = 5;
    elements.timerDisplay.textContent = timeLeft;
    elements.countdownTimer.classList.remove('warning');
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        elements.timerDisplay.textContent = timeLeft;
        
        if (timeLeft <= 2) {
            elements.countdownTimer.classList.add('warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            // Auto-submit no choice (will lose)
            if (!playerChoice) {
                socket.emit('makeChoice', {
                    gameId: currentGame.gameId,
                    choice: null
                });
            }
        }
    }, 1000);
}

// Setup screen
function checkProfileComplete() {
    const name = elements.playerNameInput.value.trim();
    if (name && playerAvatar) {
        elements.selectedName.textContent = name;
        elements.playerAvatarDisplay.textContent = playerAvatar;
        elements.selectedProfile.classList.remove('hidden');
    } else {
        elements.selectedProfile.classList.add('hidden');
    }
}

elements.playerNameInput.addEventListener('input', checkProfileComplete);

elements.emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.emojiButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        playerAvatar = btn.dataset.emoji;
        checkProfileComplete();
    });
});

elements.continueBtn.addEventListener('click', () => {
    console.log('Continue button clicked');
    const name = elements.playerNameInput.value.trim();
    console.log('Name:', name, 'Avatar:', playerAvatar);
    if (playerAvatar && name) {
        playerName = name;
        localStorage.setItem('playerAvatar', playerAvatar);
        localStorage.setItem('playerName', playerName);
        console.log('Emitting setProfile');
        socket.emit('setProfile', { avatar: playerAvatar, name: playerName, gameMode: selectedGameMode });
    } else {
        console.log('Missing name or avatar');
    }
});

// Lobby screen
elements.modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.modeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedGameMode = btn.dataset.mode;
    });
});

elements.findGameBtn.addEventListener('click', () => {
    showScreen('waiting');
    socket.emit('findGame', { gameMode: selectedGameMode });
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

elements.editAvatarBtn.addEventListener('click', () => {
    showScreen('setup');
    // Pre-select current avatar
    elements.emojiButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.emoji === playerAvatar) {
            btn.classList.add('selected');
        }
    });
    elements.playerAvatarDisplay.textContent = playerAvatar;
    elements.selectedAvatar.classList.remove('hidden');
});

// Game screen
document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!currentGame || playerChoice) return;
        
        playerChoice = btn.dataset.choice;
        clearInterval(countdownInterval);
        elements.choicesArea.classList.add('hidden');
        elements.waitingForOpponent.classList.remove('hidden');
        startChoiceTimer();
        
        socket.emit('makeChoice', {
            gameId: currentGame.gameId,
            choice: playerChoice
        });
    });
});

elements.nextRoundBtn.addEventListener('click', () => {
    elements.nextRoundBtn.classList.add('hidden');
    elements.waitingForNext.classList.remove('hidden');
    socket.emit('readyForNextRound', { gameId: currentGame.gameId });
});

elements.playAgainBtn.addEventListener('click', resetGame);
elements.returnHomeBtn.addEventListener('click', resetGame);

// Socket events
socket.on('profileSet', (data) => {
    playerId = data.id;
    elements.lobbyPlayerAvatar.textContent = playerAvatar;
    elements.lobbyPlayerName.textContent = playerName;
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
    elements.gamePlayerName.textContent = playerName;
    elements.gameOpponentAvatar.textContent = opponent.avatar;
    elements.gameOpponentName.textContent = opponent.name;
    
    // Update game mode display
    const modeText = game.gameMode === 'sudden' ? 'Sudden Death!' : `First to ${Math.ceil(parseInt(game.gameMode)/2)} wins!`;
    document.querySelector('.round-info p:last-child').textContent = modeText;
    
    showScreen('game');
    elements.waitingForOpponent.classList.add('hidden');
    elements.roundResult.classList.add('hidden');
    elements.choicesArea.classList.remove('hidden');
});

socket.on('roundResult', (result) => {
    clearInterval(countdownInterval);
    
    const isPlayer1 = currentGame.players[0].id === socket.id;
    const playerScore = isPlayer1 ? result.scores[currentGame.players[0].id] : result.scores[currentGame.players[1].id];
    const opponentScore = isPlayer1 ? result.scores[currentGame.players[1].id] : result.scores[currentGame.players[0].id];
    
    elements.playerScore.textContent = playerScore;
    elements.opponentScore.textContent = opponentScore;
    
    const playerChoiceDisplay = result.choices[socket.id];
    const opponentId = currentGame.players.find(p => p.id !== socket.id).id;
    const opponentChoiceDisplay = result.choices[opponentId];
    
    elements.playerChoiceResult.textContent = choiceEmojis[playerChoiceDisplay] || '❌';
    elements.opponentChoiceResult.textContent = choiceEmojis[opponentChoiceDisplay] || '❌';
    
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
    elements.nextRoundBtn.classList.remove('hidden');
    elements.waitingForNext.classList.add('hidden');
});

socket.on('nextRound', (data) => {
    playerChoice = null;
    elements.roundNumber.textContent = data.round;
    elements.roundResult.classList.add('hidden');
    elements.choicesArea.classList.remove('hidden');
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

socket.on('opponentReady', () => {
    if (elements.waitingForNext.classList.contains('hidden')) {
        elements.waitingForNext.querySelector('p').textContent = 'Opponent is ready! Tap when you\'re ready.';
    }
});

socket.on('playerDisconnected', () => {
    showScreen('disconnected');
});