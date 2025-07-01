# Play RPS - Rock Paper Scissors

A real-time multiplayer Rock Paper Scissors game built with Node.js and Socket.io.

## Features

- Real-time multiplayer gameplay
- Automatic matchmaking
- First to 3 rounds wins
- Clean, responsive UI
- Handles player disconnections

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

4. To play:
   - Open two browser windows/tabs
   - Click "Find Game" in both windows
   - Players will be automatically matched
   - Choose rock, paper, or scissors
   - First to win 3 rounds wins the game!

## Game Rules

- Rock beats Scissors
- Scissors beats Paper
- Paper beats Rock
- First player to win 3 rounds wins the match

## Tech Stack

- Node.js & Express (Backend)
- Socket.io (Real-time communication)
- HTML/CSS/JavaScript (Frontend)