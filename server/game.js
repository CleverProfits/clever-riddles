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
