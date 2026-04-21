import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateRiddle } from './riddle.js';
import { createGame, getGame, getUsedRiddles, joinGame, leaveGame, submitAnswer, setRiddle, deleteGame } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate riddle
app.get('/api/riddle', async (req, res) => {
  try {
    const riddle = await generateRiddle();
    res.json(riddle);
  } catch (error) {
    console.error('Error generating riddle:', error);
    res.status(500).json({
      error: 'Failed to generate riddle',
      message: error.message,
    });
  }
});

// Socket.io events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Host creates a game
  socket.on('host:create', (callback) => {
    const game = createGame(socket.id);
    socket.join(game.code);
    callback({ code: game.code });
    console.log('Game created:', game.code);
  });

  // Host starts new riddle
  socket.on('host:newRiddle', async ({ code, timerDuration }, callback) => {
    try {
      const usedRiddles = getUsedRiddles(code);
      const riddle = await generateRiddle(usedRiddles);
      const game = setRiddle(code, riddle, timerDuration);
      if (!game) {
        callback({ error: 'Game not found' });
        return;
      }
      // Send riddle to host (with answer)
      callback({ riddle });
      // Send riddle to participants (without answer)
      socket.to(code).emit('game:riddle', {
        question: riddle.question,
        hint: riddle.hint,
        timerDuration,
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // Host reveals answer
  socket.on('host:revealAnswer', ({ code }) => {
    const game = getGame(code);
    if (game && game.riddle) {
      io.to(code).emit('game:answerRevealed', { answer: game.riddle.answer });
    }
  });

  // Host ends game
  socket.on('host:endGame', ({ code }) => {
    io.to(code).emit('game:ended');
    deleteGame(code);
  });

  // Participant joins game
  socket.on('player:join', ({ code, playerName }, callback) => {
    const game = joinGame(code, socket.id, playerName);
    if (!game) {
      callback({ error: 'Game not found' });
      return;
    }
    socket.join(code);
    socket.gameCode = code;
    callback({ success: true });
    // Notify host
    io.to(game.hostSocketId).emit('game:playerJoined', { playerName });
    // If game already has a riddle, send it to the new player
    if (game.riddle) {
      socket.emit('game:riddle', {
        question: game.riddle.question,
        hint: game.riddle.hint,
        timerDuration: game.timerDuration,
      });
    }
  });

  // Participant submits answer
  socket.on('player:submitAnswer', ({ code, answer }) => {
    const submission = submitAnswer(code, socket.id, answer);
    if (submission) {
      const game = getGame(code);
      // Send to host
      io.to(game.hostSocketId).emit('game:answerSubmitted', submission);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.gameCode) {
      leaveGame(socket.gameCode, socket.id);
    }
  });
});

// Catch-all for SPA in production (Express 5 requires named wildcard)
if (process.env.NODE_ENV === 'production') {
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
