import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import TimerSelector from './TimerSelector';
import Timer from './Timer';
import AnswerDisplay from './AnswerDisplay';

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
const TOTAL_ROUNDS = 5;

export default function WYRHostView() {
  const [socket, setSocket] = useState(null);
  const [gameCode, setGameCode] = useState(null);
  const [wyr, setWyr] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timerDuration, setTimerDuration] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (socket) {
      socket.emit('host:create', { gameType: 'wyr' }, (response) => {
        setGameCode(response.code);
      });
    }
  }, [socket]);

  const fetchWYR = async () => {
    if (currentRound >= TOTAL_ROUNDS) {
      setError('Game complete! All 5 rounds finished.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowResults(false);
    setAnswers([]);
    setTimerExpired(false);
    setTimerKey((prev) => prev + 1);

    socket.emit('host:newWYR', { code: gameCode, timerDuration }, (response) => {
      setIsLoading(false);
      if (response.error) {
        setError(response.error);
        return;
      }
      setWyr(response.wyr);
      setCurrentRound((prev) => prev + 1);
      setTimerRunning(true);
    });
  };

  const handleTimerExpire = useCallback(() => {
    setTimerRunning(false);
    setTimerExpired(true);
  }, []);

  const handleShowResults = () => {
    setShowResults(true);
    setTimerRunning(false);
    if (socket && gameCode) {
      socket.emit('host:showResults', { code: gameCode });
    }
  };

  const countA = answers.filter((a) => a.answer === 'A').length;
  const countB = answers.filter((a) => a.answer === 'B').length;
  const total = countA + countB;

  const joinUrl = gameCode ? `${window.location.origin}/wyr/join/${gameCode}` : '';

  return (
    <div className="host-view wyr-host">
      <header className="app-header">
        <h1>Would You Rather</h1>
        {gameCode && (
          <div className="game-info">
            <div className="game-code">Game Code: <strong>{gameCode}</strong></div>
            <div className="join-url">Share: <code>{joinUrl}</code></div>
            <div className="round-info">Round {currentRound} of {TOTAL_ROUNDS}</div>
            <div className="players-count">{players.length} player(s) joined</div>
          </div>
        )}
      </header>

      <main className="app-main">
        {error && <div className="error-message">{error}</div>}

        {!wyr && (
          <div className="pre-game">
            <TimerSelector selected={timerDuration} onSelect={setTimerDuration} disabled={false} />
            <p className="pre-game-hint">Select timer duration, then start!</p>
          </div>
        )}

        {wyr && (
          <div className="wyr-display">
            <h2 className="wyr-title">Would You Rather...</h2>
            <div className="wyr-options">
              <div className={`wyr-option option-a ${showResults ? 'show-results' : ''}`}>
                <span className="option-label">A</span>
                <p>{wyr.optionA}</p>
                {showResults && <div className="vote-count">{countA} votes ({total > 0 ? Math.round((countA / total) * 100) : 0}%)</div>}
              </div>
              <div className="wyr-vs">OR</div>
              <div className={`wyr-option option-b ${showResults ? 'show-results' : ''}`}>
                <span className="option-label">B</span>
                <p>{wyr.optionB}</p>
                {showResults && <div className="vote-count">{countB} votes ({total > 0 ? Math.round((countB / total) * 100) : 0}%)</div>}
              </div>
            </div>
            <Timer
              key={timerKey}
              duration={timerDuration}
              onExpire={handleTimerExpire}
              isRunning={timerRunning}
              autoStart={true}
            />
          </div>
        )}

        <AnswerDisplay answers={answers.map((a) => ({ ...a, answer: a.answer === 'A' ? wyr?.optionA : wyr?.optionB }))} />

        <div className="admin-controls">
          {currentRound < TOTAL_ROUNDS ? (
            <button
              onClick={fetchWYR}
              disabled={isLoading || (timerRunning && wyr)}
              className="control-btn new-riddle-btn"
            >
              {isLoading ? 'Loading...' : currentRound === 0 ? 'Start Game' : 'Next Question'}
            </button>
          ) : (
            <div className="game-complete">Game Complete!</div>
          )}

          {wyr && !showResults && (
            <button
              onClick={handleShowResults}
              className={`control-btn reveal-btn ${timerExpired ? 'highlight' : ''}`}
            >
              Show Results
            </button>
          )}
        </div>

        {!wyr && (
          <TimerSelector selected={timerDuration} onSelect={setTimerDuration} disabled={timerRunning} />
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Claude</p>
      </footer>
    </div>
  );
}
