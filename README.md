# Ludo Modern - Multiplayer Game

A high-fidelity, real-time multiplayer Ludo game built with Vanilla JavaScript, Node.js, and Socket.io. Features a Material Design 3 aesthetic, 3D animated dice, and smooth token transitions.

## Features

- **Real-time Multiplayer**: Powered by Socket.io with room creation and joining logic.
- **Material Design 3**: Modern aesthetic with glassmorphism sidebars and MD3 color palettes.
- **3D Dice Animation**: Fully interactive 3D dice with pip-based faces and physics-inspired animations.
- **Optimized Movement**: Smooth CSS transitions for token sliding and collision (capture) logic.
- **Mobile Responsive**: Scales perfectly across different screen sizes.

## Project Structure

- `public/`: Contains frontend assets (HTML, CSS, JS).
- `server/`: Node.js Express server and Socket.io signaling.

## Setup & Local Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start the Server**:
    ```bash
    npm start
    ```
3.  **Play**:
    Open `http://localhost:3005` in two different browser windows to play against yourself or share the Room ID with a friend.

## Tech Stack

- **Frontend**: HTML5, CSS3 (3D Transforms, CSS Grid), Vanilla JavaScript (ES6+).
- **Backend**: Node.js, Express.
- **Real-time**: Socket.io.
