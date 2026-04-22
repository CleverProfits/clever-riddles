// In-memory game sessions
const games = new Map();

export function createGame(hostSocketId, gameType = 'riddles') {
  const code = generateCode();
  const game = {
    code,
    hostSocketId,
    gameType,
    question: null, // riddle or WYR question
    timerDuration: 60,
    answers: [],
    usedQuestions: [], // Track used questions to prevent duplicates
    round: 0,
    participants: new Map(),
    createdAt: Date.now(),
  };
  games.set(code, game);
  return game;
}

export function getUsedQuestions(code) {
  const game = getGame(code);
  return game ? game.usedQuestions : [];
}

export function getGame(code) {
  return games.get(code?.toUpperCase());
}

export function joinGame(code, socketId, playerName) {
  const game = getGame(code);
  if (!game) return null;
  game.participants.set(socketId, { name: playerName, joinedAt: Date.now() });
  return game;
}

export function leaveGame(code, socketId) {
  const game = getGame(code);
  if (game) {
    game.participants.delete(socketId);
  }
}

export function submitAnswer(code, socketId, answer) {
  const game = getGame(code);
  if (!game) return null;
  const participant = game.participants.get(socketId);
  if (!participant) return null;

  const submission = {
    id: Date.now() + Math.random(),
    playerName: participant.name,
    answer,
    timestamp: Date.now(),
  };
  game.answers.push(submission);
  return submission;
}

export function setQuestion(code, question, timerDuration) {
  const game = getGame(code);
  if (!game) return null;
  game.question = question;
  game.timerDuration = timerDuration;
  game.answers = [];
  game.round += 1;

  // Track to prevent duplicates
  if (question) {
    if (game.gameType === 'riddles' && question.answer) {
      game.usedQuestions.push(question.answer.toLowerCase());
    } else if (game.gameType === 'wyr') {
      game.usedQuestions.push(`${question.optionA}|${question.optionB}`);
    }
  }
  return game;
}

export function deleteGame(code) {
  games.delete(code?.toUpperCase());
}

// Imposter game specific functions
export function setImposterRound(code, category, secretWord, imposterId, totalRounds, turnOrder) {
  const game = getGame(code);
  if (!game) return null;

  game.category = category;
  game.secretWord = secretWord;
  game.imposterId = imposterId;
  game.totalRounds = totalRounds;
  game.currentRound = 1;
  game.roundAnswers = []; // All answers across rounds
  game.votes = new Map();
  game.usedQuestions.push(secretWord.toLowerCase());
  game.turnOrder = turnOrder; // Fixed order of player IDs
  game.currentTurnIndex = 0; // Index into turnOrder

  return game;
}

export function getCurrentTurn(code) {
  const game = getGame(code);
  if (!game || !game.turnOrder) return null;
  return game.turnOrder[game.currentTurnIndex];
}

export function advanceTurn(code) {
  const game = getGame(code);
  if (!game) return null;

  game.currentTurnIndex++;

  // Check if round is complete
  if (game.currentTurnIndex >= game.turnOrder.length) {
    game.currentTurnIndex = 0;

    // Check if all rounds complete
    if (game.currentRound >= game.totalRounds) {
      return { game, roundComplete: true, gameComplete: true };
    }

    game.currentRound++;
    return { game, roundComplete: true, gameComplete: false };
  }

  return { game, roundComplete: false, gameComplete: false };
}

export function submitImposterAnswer(code, socketId, answer, round) {
  const game = getGame(code);
  if (!game) return null;
  const participant = game.participants.get(socketId);
  if (!participant) return null;

  const submission = {
    id: Date.now() + Math.random(),
    socketId,
    playerName: participant.name,
    answer,
    round,
    timestamp: Date.now(),
  };
  game.roundAnswers.push(submission);
  return submission;
}

export function nextImposterRound(code) {
  const game = getGame(code);
  if (!game) return null;
  game.currentRound += 1;
  return game;
}

export function submitVote(code, voterId, suspectId) {
  const game = getGame(code);
  if (!game) return null;
  game.votes.set(voterId, suspectId);
  return { voterId, suspectId };
}

export function getVoteResults(code) {
  const game = getGame(code);
  if (!game) return null;

  const voteCounts = new Map();
  for (const [voterId, suspectId] of game.votes) {
    voteCounts.set(suspectId, (voteCounts.get(suspectId) || 0) + 1);
  }

  return {
    votes: Array.from(game.votes.entries()).map(([voterId, suspectId]) => {
      const voter = game.participants.get(voterId);
      const suspect = game.participants.get(suspectId);
      return { voterName: voter?.name, suspectName: suspect?.name };
    }),
    counts: Array.from(voteCounts.entries()).map(([id, count]) => {
      const player = game.participants.get(id);
      return { playerId: id, playerName: player?.name, votes: count };
    }).sort((a, b) => b.votes - a.votes),
    imposterId: game.imposterId,
    imposterName: game.participants.get(game.imposterId)?.name,
  };
}

export function getParticipantsList(code) {
  const game = getGame(code);
  if (!game) return [];
  return Array.from(game.participants.entries()).map(([id, p]) => ({
    id,
    name: p.name,
  }));
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (games.has(code)) return generateCode();
  return code;
}

// Cleanup old games (older than 2 hours)
setInterval(() => {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, game] of games) {
    if (game.createdAt < twoHoursAgo) {
      games.delete(code);
    }
  }
}, 30 * 60 * 1000);
