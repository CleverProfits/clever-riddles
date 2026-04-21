import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateRiddle } from './riddle.js';
import { generateWYR } from './wyr.js';
import { createGame, getGame, getUsedQuestions, joinGame, leaveGame, submitAnswer, setQuestion, deleteGame } from './game.js';

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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Host creates a game (riddles or wyr)
  socket.on('host:create', ({ gameType }, callback) => {
    const game = createGame(socket.id, gameType || 'riddles');
    socket.join(game.code);
    callback({ code: game.code, gameType: game.gameType });
    console.log('Game created:', game.code, game.gameType);
  });

  // Host starts new riddle
  socket.on('host:newRiddle', async ({ code, timerDuration }, callback) => {
    try {
      const usedQuestions = getUsedQuestions(code);
      const riddle = await generateRiddle(usedQuestions);
      const game = setQuestion(code, riddle, timerDuration);
      if (!game) {
        callback({ error: 'Game not found' });
        return;
      }
      callback({ riddle });
      socket.to(code).emit('game:riddle', {
        question: riddle.question,
        hint: riddle.hint,
        timerDuration,
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // Host starts new WYR question
  socket.on('host:newWYR', async ({ code, timerDuration }, callback) => {
    try {
      const usedQuestions = getUsedQuestions(code);
      const wyr = await generateWYR(usedQuestions);
      const game = setQuestion(code, wyr, timerDuration);
      if (!game) {
        callback({ error: 'Game not found' });
        return;
      }
      callback({ wyr });
      socket.to(code).emit('game:wyr', {
        optionA: wyr.optionA,
        optionB: wyr.optionB,
        timerDuration,
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // Host reveals answer (riddles only)
  socket.on('host:revealAnswer', ({ code }) => {
    const game = getGame(code);
    if (game && game.question && game.question.answer) {
      io.to(code).emit('game:answerRevealed', { answer: game.question.answer });
    }
  });

  // Host shows results (WYR)
  socket.on('host:showResults', ({ code }) => {
    const game = getGame(code);
    if (game) {
      const countA = game.answers.filter(a => a.answer === 'A').length;
      const countB = game.answers.filter(a => a.answer === 'B').length;
      io.to(code).emit('game:results', { countA, countB });
    }
  });

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
    callback({ success: true, gameType: game.gameType });
    io.to(game.hostSocketId).emit('game:playerJoined', { playerName });

    // Send current question if exists
    if (game.question) {
      if (game.gameType === 'riddles') {
        socket.emit('game:riddle', {
          question: game.question.question,
          hint: game.question.hint,
          timerDuration: game.timerDuration,
        });
      } else if (game.gameType === 'wyr') {
        socket.emit('game:wyr', {
          optionA: game.question.optionA,
          optionB: game.question.optionB,
          timerDuration: game.timerDuration,
        });
      }
    }
  });

  // Participant submits answer
  socket.on('player:submitAnswer', ({ code, answer }) => {
    const submission = submitAnswer(code, socket.id, answer);
    if (submission) {
      const game = getGame(code);
      io.to(game.hostSocketId).emit('game:answerSubmitted', submission);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.gameCode) {
      leaveGame(socket.gameCode, socket.id);
    }
  });
});

if (process.env.NODE_ENV === 'production') {
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
