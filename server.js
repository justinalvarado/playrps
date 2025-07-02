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
const players = new Map();
const rooms = new Map();

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function createGame(player1Id, player2Id, roomCode = null) {
    const gameId = Math.random().toString(36).substring(7);
    games.set(gameId, {
        id: gameId,
        players: [player1Id, player2Id],
        choices: {},
        scores: { [player1Id]: 0, [player2Id]: 0 },
        round: 1,
        roomCode,
        readyForNext: new Set()
    });
    return gameId;
}

function determineWinner(choice1, choice2) {
    // Handle null choices (timeouts)
    if (choice1 === null && choice2 === null) return 'tie';
    if (choice1 === null) return 'player2';
    if (choice2 === null) return 'player1';
    
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

function getOnlinePlayers(excludeId) {
    const onlinePlayers = [];
    for (const [id, player] of players.entries()) {
        if (id !== excludeId && !player.inGame) {
            onlinePlayers.push({
                id,
                avatar: player.avatar
            });
        }
    }
    return onlinePlayers;
}

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

    socket.on('setAvatar', (avatar) => {
        players.set(socket.id, {
            id: socket.id,
            avatar,
            inGame: false
        });
        
        socket.emit('avatarSet', { id: socket.id });
        
        // Broadcast updated player list to all clients
        io.emit('onlinePlayersUpdate', getOnlinePlayers());
    });

    socket.on('findGame', () => {
        const player = players.get(socket.id);
        if (!player) return;

        if (waitingPlayers.length > 0) {
            const opponentId = waitingPlayers.pop();
            const opponent = io.sockets.sockets.get(opponentId);
            
            if (opponent && players.get(opponentId)) {
                const gameId = createGame(socket.id, opponentId);
                
                players.get(socket.id).inGame = true;
                players.get(opponentId).inGame = true;
                
                socket.join(gameId);
                opponent.join(gameId);
                
                io.to(gameId).emit('gameFound', {
                    gameId,
                    players: [
                        { id: socket.id, avatar: players.get(socket.id).avatar },
                        { id: opponentId, avatar: players.get(opponentId).avatar }
                    ]
                });
                
                io.emit('onlinePlayersUpdate', getOnlinePlayers());
            } else {
                // Opponent disconnected, try again
                socket.emit('findGame');
            }
        } else {
            waitingPlayers.push(socket.id);
            socket.emit('waiting');
        }
    });

    socket.on('createRoom', () => {
        const player = players.get(socket.id);
        if (!player) return;

        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
            host: socket.id,
            players: [socket.id],
            full: false
        });
        
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode });
    });

    socket.on('joinRoom', (roomCode) => {
        const player = players.get(socket.id);
        if (!player) return;

        const room = rooms.get(roomCode);
        if (!room) {
            socket.emit('roomError', { message: 'Room not found' });
            return;
        }

        if (room.full) {
            socket.emit('roomError', { message: 'Room is full' });
            return;
        }

        room.players.push(socket.id);
        room.full = true;
        socket.join(roomCode);

        const hostId = room.host;
        const hostSocket = io.sockets.sockets.get(hostId);
        
        if (!hostSocket) {
            socket.emit('roomError', { message: 'Host has disconnected' });
            rooms.delete(roomCode);
            return;
        }
        
        const gameId = createGame(hostId, socket.id, roomCode);
        
        players.get(hostId).inGame = true;
        players.get(socket.id).inGame = true;
        
        // Both players need to join the gameId room
        hostSocket.join(gameId);
        socket.join(gameId);

        io.to(gameId).emit('gameFound', {
            gameId,
            players: [
                { id: hostId, avatar: players.get(hostId).avatar },
                { id: socket.id, avatar: players.get(socket.id).avatar }
            ]
        });

        rooms.delete(roomCode);
        io.emit('onlinePlayersUpdate', getOnlinePlayers());
    });

    socket.on('cancelRoom', (roomCode) => {
        rooms.delete(roomCode);
        socket.leave(roomCode);
    });

    socket.on('challengePlayer', (targetId) => {
        const challenger = players.get(socket.id);
        const target = players.get(targetId);
        
        if (!challenger || !target || target.inGame) {
            socket.emit('challengeError', { message: 'Player not available' });
            return;
        }

        io.to(targetId).emit('challengeReceived', {
            challengerId: socket.id,
            challengerAvatar: challenger.avatar
        });
    });

    socket.on('acceptChallenge', (challengerId) => {
        const acceptor = players.get(socket.id);
        const challenger = players.get(challengerId);
        
        if (!acceptor || !challenger) return;

        const gameId = createGame(challengerId, socket.id);
        
        players.get(challengerId).inGame = true;
        players.get(socket.id).inGame = true;

        const challengerSocket = io.sockets.sockets.get(challengerId);
        if (challengerSocket) {
            challengerSocket.join(gameId);
            socket.join(gameId);

            io.to(gameId).emit('gameFound', {
                gameId,
                players: [
                    { id: challengerId, avatar: challenger.avatar },
                    { id: socket.id, avatar: acceptor.avatar }
                ]
            });

            io.emit('onlinePlayersUpdate', getOnlinePlayers());
        }
    });

    socket.on('cancelWaiting', () => {
        const waitingIndex = waitingPlayers.findIndex(id => id === socket.id);
        if (waitingIndex !== -1) {
            waitingPlayers.splice(waitingIndex, 1);
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
                
                // Mark players as not in game
                game.players.forEach(playerId => {
                    if (players.get(playerId)) {
                        players.get(playerId).inGame = false;
                    }
                });
                
                games.delete(gameId);
                io.emit('onlinePlayersUpdate', getOnlinePlayers());
            }
        }
    });

    socket.on('readyForNextRound', ({ gameId }) => {
        const game = games.get(gameId);
        if (!game) return;

        game.readyForNext.add(socket.id);

        if (game.readyForNext.size === 2) {
            // Both players ready, start next round
            game.readyForNext.clear();
            io.to(gameId).emit('nextRound', { round: game.round });
        } else {
            // Let other player know someone is ready
            const waitingPlayerId = game.players.find(id => id !== socket.id);
            io.to(waitingPlayerId).emit('opponentReady');
        }
    });

    socket.on('disconnect', () => {
        const waitingIndex = waitingPlayers.findIndex(id => id === socket.id);
        if (waitingIndex !== -1) {
            waitingPlayers.splice(waitingIndex, 1);
        }

        // Clean up rooms
        for (const [code, room] of rooms.entries()) {
            if (room.host === socket.id) {
                rooms.delete(code);
            }
        }

        // Handle game disconnection
        for (const [gameId, game] of games.entries()) {
            if (game.players.includes(socket.id)) {
                io.to(gameId).emit('playerDisconnected');
                
                // Mark other player as not in game
                game.players.forEach(playerId => {
                    if (players.get(playerId)) {
                        players.get(playerId).inGame = false;
                    }
                });
                
                games.delete(gameId);
            }
        }

        players.delete(socket.id);
        io.emit('onlinePlayersUpdate', getOnlinePlayers());
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});