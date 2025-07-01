# Play RPS - Rock Paper Scissors

A real-time multiplayer Rock Paper Scissors game built with Node.js and Socket.io.

## Features

- **Player Avatars**: Choose from 12 different emoji avatars
- **Multiple Game Modes**:
  - Quick Match: Random opponent matchmaking
  - Private Rooms: Create/join games with 6-character room codes
  - Direct Challenges: Challenge specific online players
- **Lobby System**: See who's online and available to play
- **Real-time Gameplay**: Instant updates via Socket.io
- **First to 3 Wins**: Best of 5 format
- **Clean, Responsive UI**: Works on desktop and mobile
- **Disconnect Handling**: Graceful handling when players leave

## How to Run

1. Navigate to the project directory:
   ```bash
   cd playrps
   ```

2. Start the server:
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. Open your browser and go to:
   ```
   http://localhost:3000
   ```

## How to Play

1. **Choose Your Avatar**: Select an emoji that represents you
2. **Join a Game**:
   - **Quick Match**: Click "Find Random Opponent" for automatic matchmaking
   - **Private Room**: Create a room and share the 6-character code with a friend
   - **Challenge**: Click "Challenge" next to any online player
3. **Play**: Choose rock, paper, or scissors each round
4. **Win**: First player to win 3 rounds wins the match!

## Game Rules

- Rock beats Scissors
- Scissors beats Paper
- Paper beats Rock
- First player to win 3 rounds wins the match

## Tech Stack

- Node.js & Express (Backend)
- Socket.io (Real-time communication)
- HTML/CSS/JavaScript (Frontend)