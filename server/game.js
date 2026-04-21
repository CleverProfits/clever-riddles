// In-memory game sessions
const games = new Map();

export function createGame(hostSocketId) {
  const code = generateCode();
  const game = {
    code,
    hostSocketId,
    riddle: null,
    timerDuration: 60,
    answers: [],
    usedRiddles: [], // Track used riddle answers to prevent duplicates
    round: 0,
    participants: new Map(),
    createdAt: Date.now(),
  };
  games.set(code, game);
  return game;
}

export function getUsedRiddles(code) {
  const game = getGame(code);
  return game ? game.usedRiddles : [];
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

export function setRiddle(code, riddle, timerDuration) {
  const game = getGame(code);
  if (!game) return null;
  game.riddle = riddle;
  game.timerDuration = timerDuration;
  game.answers = [];
  game.round += 1;
  // Track this riddle's answer to prevent duplicates
  if (riddle && riddle.answer) {
    game.usedRiddles.push(riddle.answer.toLowerCase());
  }
  return game;
}

export function deleteGame(code) {
  games.delete(code?.toUpperCase());
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure unique
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
