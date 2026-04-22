import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateRiddle } from './riddle.js';
import { generateWYR } from './wyr.js';
import { generateImposterRound, selectImposter } from './imposter.js';
import { createGame, getGame, getUsedQuestions, joinGame, leaveGame, submitAnswer, setQuestion, deleteGame, setImposterRound, submitImposterAnswer, submitVote, getVoteResults, getParticipantsList, getCurrentTurn, advanceTurn } from './game.js';

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

  // === IMPOSTER GAME EVENTS ===

  // Host starts an Imposter round
  socket.on('host:startImposter', async ({ code, totalRounds }, callback) => {
    try {
      const game = getGame(code);
      if (!game) {
        callback({ error: 'Game not found' });
        return;
      }

      const participants = getParticipantsList(code);
      if (participants.length < 3) {
        callback({ error: 'Need at least 3 players to start' });
        return;
      }

      const usedWords = getUsedQuestions(code);
      const { category, secretWord } = await generateImposterRound(usedWords);
      const imposterId = selectImposter(participants.map(p => p.id));

      // Shuffle participants for turn order
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const turnOrder = shuffled.map(p => p.id);

      setImposterRound(code, category, secretWord, imposterId, totalRounds, turnOrder);

      const firstPlayerId = turnOrder[0];
      const firstPlayerName = participants.find(p => p.id === firstPlayerId)?.name;

      callback({
        category,
        secretWord,
        imposterId,
        currentRound: 1,
        totalRounds,
        participants,
        turnOrder: shuffled,
        currentTurnId: firstPlayerId,
        currentTurnName: firstPlayerName
      });

      // Send to each player - imposter gets different info
      participants.forEach(p => {
        const isImposter = p.id === imposterId;
        io.to(p.id).emit('game:imposterStart', {
          category,
          secretWord: isImposter ? null : secretWord,
          isImposter,
          currentRound: 1,
          totalRounds,
          turnOrder: shuffled,
          currentTurnId: firstPlayerId,
          isYourTurn: p.id === firstPlayerId,
        });
      });

    } catch (error) {
      callback({ error: error.message });
    }
  });

  // Host advances to next round
  socket.on('host:nextImposterRound', ({ code }, callback) => {
    const game = nextImposterRound(code);
    if (!game) {
      callback({ error: 'Game not found' });
      return;
    }

    callback({ currentRound: game.currentRound });
    io.to(code).emit('game:imposterNextRound', {
      currentRound: game.currentRound
    });
  });

  // Host triggers voting phase
  socket.on('host:startVoting', ({ code }, callback) => {
    const game = getGame(code);
    if (!game) {
      callback({ error: 'Game not found' });
      return;
    }

    const participants = getParticipantsList(code);
    callback({ participants });
    io.to(code).emit('game:votingStart', { participants });
  });

  // Host reveals imposter results
  socket.on('host:revealImposter', ({ code }, callback) => {
    const results = getVoteResults(code);
    if (!results) {
      callback({ error: 'Game not found' });
      return;
    }

    const game = getGame(code);
    callback({
      ...results,
      secretWord: game.secretWord,
      category: game.category
    });
    io.to(code).emit('game:imposterRevealed', {
      ...results,
      secretWord: game.secretWord,
      category: game.category
    });
  });

  // Player submits imposter answer (clue)
  socket.on('player:submitImposterAnswer', ({ code, answer, round }, callback) => {
    const game = getGame(code);
    if (!game) {
      callback?.({ error: 'Game not found' });
      return;
    }

    // Enforce turn order
    const currentTurnId = getCurrentTurn(code);
    if (socket.id !== currentTurnId) {
      callback?.({ error: 'Not your turn' });
      return;
    }

    const submission = submitImposterAnswer(code, socket.id, answer, round);
    if (submission) {
      io.to(game.hostSocketId).emit('game:imposterAnswerSubmitted', submission);
      socket.to(code).emit('game:imposterAnswerSubmitted', submission);
      callback?.({ success: true });

      // Advance turn
      const { game: updatedGame, roundComplete, gameComplete } = advanceTurn(code);
      const participants = getParticipantsList(code);

      if (gameComplete) {
        // All rounds done - start voting
        io.to(game.hostSocketId).emit('game:autoStartVoting', { participants });
        io.to(code).emit('game:votingStart', { participants });
      } else {
        // Send turn update to everyone
        const nextTurnId = getCurrentTurn(code);
        const nextPlayer = participants.find(p => p.id === nextTurnId);

        const turnUpdate = {
          currentTurnId: nextTurnId,
          currentTurnName: nextPlayer?.name,
          currentRound: updatedGame.currentRound,
          roundComplete
        };

        io.to(game.hostSocketId).emit('game:turnUpdate', turnUpdate);

        participants.forEach(p => {
          io.to(p.id).emit('game:turnUpdate', {
            ...turnUpdate,
            isYourTurn: p.id === nextTurnId
          });
        });
      }
    }
  });

  // Player submits vote
  socket.on('player:submitVote', ({ code, suspectId }, callback) => {
    const result = submitVote(code, socket.id, suspectId);
    if (result) {
      const game = getGame(code);
      const participants = getParticipantsList(code);
      const totalVotes = game.votes.size;

      // Calculate live vote percentages
      const voteCounts = new Map();
      for (const [, sId] of game.votes) {
        voteCounts.set(sId, (voteCounts.get(sId) || 0) + 1);
      }

      const liveResults = participants.map(p => ({
        playerId: p.id,
        playerName: p.name,
        votes: voteCounts.get(p.id) || 0,
        percentage: totalVotes > 0 ? Math.round(((voteCounts.get(p.id) || 0) / totalVotes) * 100) : 0
      })).sort((a, b) => b.votes - a.votes);

      io.to(game.hostSocketId).emit('game:voteUpdate', {
        totalVotes,
        totalPlayers: participants.length,
        results: liveResults
      });

      callback({ success: true });
    } else {
      callback({ error: 'Could not submit vote' });
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

    // If imposter game is in progress, send current state
    if (game.gameType === 'imposter' && game.secretWord) {
      const isImposter = socket.id === game.imposterId;
      socket.emit('game:imposterStart', {
        category: game.category,
        secretWord: isImposter ? null : game.secretWord,
        isImposter,
        currentRound: game.currentRound,
        totalRounds: game.totalRounds,
      });
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
