const socket = io();

const screens = {
    waiting: document.getElementById('waiting-screen'),
    game: document.getElementById('game-screen'),
    gameOver: document.getElementById('game-over-screen'),
    disconnected: document.getElementById('disconnected-screen')
};

const elements = {
    findGameBtn: document.getElementById('find-game-btn'),
    waitingMessage: document.getElementById('waiting-message'),
    playerScore: document.getElementById('player-score'),
    opponentScore: document.getElementById('opponent-score'),
    roundNumber: document.getElementById('round-number'),
    choicesArea: document.getElementById('choices-area'),
    waitingForOpponent: document.getElementById('waiting-for-opponent'),
    roundResult: document.getElementById('round-result'),
    playerChoiceResult: document.getElementById('player-choice-result'),
    opponentChoiceResult: document.getElementById('opponent-choice-result'),
    roundWinner: document.getElementById('round-winner'),
    gameResult: document.getElementById('game-result'),
    finalPlayerScore: document.getElementById('final-player-score'),
    finalOpponentScore: document.getElementById('final-opponent-score'),
    playAgainBtn: document.getElementById('play-again-btn'),
    returnHomeBtn: document.getElementById('return-home-btn')
};

let currentGame = null;
let playerChoice = null;

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
    showScreen('waiting');
}

elements.findGameBtn.addEventListener('click', () => {
    elements.findGameBtn.classList.add('hidden');
    elements.waitingMessage.classList.remove('hidden');
    socket.emit('findGame');
});

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

socket.on('waiting', () => {
    console.log('Waiting for opponent...');
});

socket.on('gameFound', (game) => {
    currentGame = game;
    showScreen('game');
    elements.choicesArea.classList.remove('hidden');
    elements.waitingForOpponent.classList.add('hidden');
    elements.roundResult.classList.add('hidden');
});

socket.on('roundResult', (result) => {
    const isPlayer1 = currentGame.players[0] === socket.id;
    const playerScore = isPlayer1 ? result.scores[currentGame.players[0]] : result.scores[currentGame.players[1]];
    const opponentScore = isPlayer1 ? result.scores[currentGame.players[1]] : result.scores[currentGame.players[0]];
    
    elements.playerScore.textContent = playerScore;
    elements.opponentScore.textContent = opponentScore;
    
    const playerChoiceDisplay = result.choices[socket.id];
    const opponentId = currentGame.players.find(id => id !== socket.id);
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
    const isPlayer1 = currentGame.players[0] === socket.id;
    const playerScore = isPlayer1 ? result.scores[currentGame.players[0]] : result.scores[currentGame.players[1]];
    const opponentScore = isPlayer1 ? result.scores[currentGame.players[1]] : result.scores[currentGame.players[0]];
    
    elements.gameResult.textContent = isWinner ? '🎉 You Win! 🎉' : 'You Lose';
    elements.gameResult.className = isWinner ? 'win' : 'lose';
    elements.finalPlayerScore.textContent = playerScore;
    elements.finalOpponentScore.textContent = opponentScore;
    
    showScreen('gameOver');
});

socket.on('playerDisconnected', () => {
    showScreen('disconnected');
});