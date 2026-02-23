const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

const rooms = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('create-room', ({ roomId }) => {
        if (rooms.has(roomId)) {
            socket.emit('error', 'Room already exists');
            return;
        }

        socket.join(roomId);
        rooms.set(roomId, {
            players: [{ id: socket.id, type: 'RED' }],
            gameState: {
                turn: 'RED',
                diceValue: 0,
                isRolling: false,
                players: {
                    RED: { tokens: [0, 0, 0, 0] },
                    YELLOW: { tokens: [0, 0, 0, 0] },
                },
                winner: null
            }
        });
        socket.emit('room-joined', { roomId, playerType: 'RED' });
    });

    socket.on('join-room', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('error', 'Room is full (2 players max)');
            return;
        }

        socket.join(roomId);
        room.players.push({ id: socket.id, type: 'YELLOW' });
        socket.emit('room-joined', { roomId, playerType: 'YELLOW' });
        
        io.to(roomId).emit('start-game');
        // Initial sync
        io.to(roomId).emit('game-state-sync', room.gameState);
    });

    socket.on('game-state-update', ({ roomId, newState }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.gameState = newState;
            // Broadcast to everyone in the room including sender
            io.to(roomId).emit('game-state-sync', newState);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Cleanup empty rooms
        rooms.forEach((room, roomId) => {
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                rooms.delete(roomId);
                console.log(`Room deleted: ${roomId}`);
            }
        });
    });
});

const PORT = 3005;
server.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});