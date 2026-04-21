import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import RiddleDisplay from './RiddleDisplay';
import Timer from './Timer';
import TimerSelector from './TimerSelector';
import AnswerDisplay from './AnswerDisplay';

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
const TOTAL_ROUNDS = 5;

export default function HostView() {
  const [socket, setSocket] = useState(null);
  const [gameCode, setGameCode] = useState(null);
  const [riddle, setRiddle] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [error, setError] = useState(null);

  // Initialize socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('game:playerJoined', ({ playerName }) => {
      setPlayers((prev) => [...prev, playerName]);
    });

    newSocket.on('game:answerSubmitted', (submission) => {
      setAnswers((prev) => [...prev, submission]);
    });

    return () => newSocket.close();
  }, []);

  // Create game on mount
  useEffect(() => {
    if (socket) {
      socket.emit('host:create', { gameType: 'riddles' }, (response) => {
        setGameCode(response.code);
      });
    }
  }, [socket]);

  const fetchRiddle = async () => {
    if (currentRound >= TOTAL_ROUNDS) {
      setError('Game complete! All 5 rounds finished.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowAnswer(false);
    setAnswers([]);
    setTimerExpired(false);
    setTimerKey((prev) => prev + 1);

    socket.emit('host:newRiddle', { code: gameCode, timerDuration }, (response) => {
      setIsLoading(false);
      if (response.error) {
        setError(response.error);
        return;
      }
      setRiddle(response.riddle);
      setCurrentRound((prev) => prev + 1);
      // Start timer immediately
      setTimerRunning(true);
    });
  };

  const handleTimerExpire = useCallback(() => {
    setTimerRunning(false);
    setTimerExpired(true);
  }, []);

  const handleRevealAnswer = () => {
    setShowAnswer(true);
    setTimerRunning(false);
    if (socket && gameCode) {
      socket.emit('host:revealAnswer', { code: gameCode });
    }
  };

  const joinUrl = gameCode
    ? `${window.location.origin}/riddles/join/${gameCode}`
    : '';

  return (
    <div className="host-view">
      <header className="app-header">
        <Link to="/" className="home-btn">← Back to Games</Link>
        <h1>Clever Riddles</h1>
        {gameCode && (
          <div className="game-info">
            <div className="game-code">
              Game Code: <strong>{gameCode}</strong>
            </div>
            <div className="join-url">
              Share: <code>{joinUrl}</code>
            </div>
            <div className="round-info">
              Round {currentRound} of {TOTAL_ROUNDS}
            </div>
            <div className="players-count">{players.length} player(s) joined</div>
          </div>
        )}
      </header>

      <main className="app-main">
        {error && <div className="error-message">{error}</div>}

        {!riddle && (
          <div className="pre-game">
            <TimerSelector
              selected={timerDuration}
              onSelect={setTimerDuration}
              disabled={false}
            />
            <p className="pre-game-hint">Select timer duration, then start the game!</p>
          </div>
        )}

        {riddle && (
          <>
            <RiddleDisplay riddle={riddle} showAnswer={showAnswer} />
            <Timer
              key={timerKey}
              duration={timerDuration}
              onExpire={handleTimerExpire}
              isRunning={timerRunning}
              autoStart={true}
            />
          </>
        )}

        <AnswerDisplay answers={answers} />

        <div className="admin-controls">
          {currentRound < TOTAL_ROUNDS ? (
            <button
              onClick={fetchRiddle}
              disabled={isLoading || (timerRunning && riddle)}
              className="control-btn new-riddle-btn"
            >
              {isLoading ? 'Loading...' : currentRound === 0 ? 'Start Game' : 'Next Riddle'}
            </button>
          ) : (
            <div className="game-complete">Game Complete!</div>
          )}

          {riddle && (
            <button
              onClick={handleRevealAnswer}
              disabled={showAnswer}
              className={`control-btn reveal-btn ${timerExpired && !showAnswer ? 'highlight' : ''}`}
            >
              {showAnswer ? 'Answer Revealed' : 'Reveal Answer'}
            </button>
          )}
        </div>

        {!riddle && (
          <TimerSelector
            selected={timerDuration}
            onSelect={setTimerDuration}
            disabled={timerRunning}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Claude</p>
      </footer>
    </div>
  );
}
