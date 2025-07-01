const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

const games = new Map();
const waitingPlayers = [];

function createGame(player1, player2) {
    const gameId = Math.random().toString(36).substring(7);
    games.set(gameId, {
        id: gameId,
        players: [player1, player2],
        choices: {},
        scores: { [player1]: 0, [player2]: 0 },
        round: 1
    });
    return gameId;
}

function determineWinner(choice1, choice2) {
    if (choice1 === choice2) return 'tie';
    if (
        (choice1 === 'rock' && choice2 === 'scissors') ||
        (choice1 === 'paper' && choice2 === 'rock') ||
        (choice1 === 'scissors' && choice2 === 'paper')
    ) {
        return 'player1';
    }
    return 'player2';
}

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

    socket.on('findGame', () => {
        if (waitingPlayers.length > 0) {
            const opponentId = waitingPlayers.pop();
            const opponent = io.sockets.sockets.get(opponentId);
            
            if (opponent) {
                const gameId = createGame(socket.id, opponentId);
                
                socket.join(gameId);
                opponent.join(gameId);
                
                io.to(gameId).emit('gameFound', {
                    gameId,
                    players: [socket.id, opponentId]
                });
            } else {
                // Opponent disconnected, try again
                socket.emit('findGame');
            }
        } else {
            waitingPlayers.push(socket.id);
            socket.emit('waiting');
        }
    });

    socket.on('makeChoice', ({ gameId, choice }) => {
        const game = games.get(gameId);
        if (!game) return;

        game.choices[socket.id] = choice;

        if (Object.keys(game.choices).length === 2) {
            const [player1, player2] = game.players;
            const choice1 = game.choices[player1];
            const choice2 = game.choices[player2];
            
            const result = determineWinner(choice1, choice2);
            
            if (result === 'player1') {
                game.scores[player1]++;
            } else if (result === 'player2') {
                game.scores[player2]++;
            }

            io.to(gameId).emit('roundResult', {
                choices: game.choices,
                winner: result === 'tie' ? null : (result === 'player1' ? player1 : player2),
                scores: game.scores,
                round: game.round
            });

            game.choices = {};
            game.round++;

            if (Math.max(...Object.values(game.scores)) >= 3) {
                const winner = Object.entries(game.scores).find(([_, score]) => score >= 3)[0];
                io.to(gameId).emit('gameOver', {
                    winner,
                    scores: game.scores
                });
                games.delete(gameId);
            } else {
                setTimeout(() => {
                    io.to(gameId).emit('nextRound', { round: game.round });
                }, 3000);
            }
        }
    });

    socket.on('disconnect', () => {
        const waitingIndex = waitingPlayers.findIndex(id => id === socket.id);
        if (waitingIndex !== -1) {
            waitingPlayers.splice(waitingIndex, 1);
        }

        for (const [gameId, game] of games.entries()) {
            if (game.players.includes(socket.id)) {
                io.to(gameId).emit('playerDisconnected');
                games.delete(gameId);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});