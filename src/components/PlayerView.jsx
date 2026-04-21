import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export default function PlayerView() {
  const { code } = useParams();
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [riddle, setRiddle] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState(null);
  const [error, setError] = useState(null);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  // Initialize socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('game:riddle', ({ question, hint, timerDuration: duration }) => {
      setRiddle({ question, hint });
      setTimerDuration(duration);
      setTimeLeft(duration);
      setAnswer('');
      setSubmitted(false);
      setRevealedAnswer(null);
    });

    newSocket.on('game:answerRevealed', ({ answer }) => {
      setRevealedAnswer(answer);
    });

    newSocket.on('game:ended', () => {
      setGameEnded(true);
    });

    return () => newSocket.close();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!riddle || timeLeft <= 0 || submitted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [riddle, timeLeft, submitted]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim() || !socket) return;

    socket.emit('player:join', { code: code.toUpperCase(), playerName: playerName.trim() }, (response) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      setJoined(true);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim() || !socket || submitted) return;

    socket.emit('player:submitAnswer', { code: code.toUpperCase(), answer: answer.trim() });
    setSubmitted(true);
  };

  if (gameEnded) {
    return (
      <div className="player-view">
        <div className="game-ended">
          <h2>Game Over!</h2>
          <p>Thanks for playing!</p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="player-view">
        <div className="join-form-container">
          <h1>Join Game</h1>
          <p className="game-code-display">Code: <strong>{code?.toUpperCase()}</strong></p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleJoin} className="join-form">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button type="submit" disabled={!playerName.trim()}>
              Join Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="player-view">
      <header className="player-header">
        <span className="player-name-badge">{playerName}</span>
        {riddle && <span className="player-timer">{timeLeft}s</span>}
      </header>

      <main className="player-main">
        {!riddle ? (
          <div className="waiting">
            <h2>Waiting for riddle...</h2>
            <p>The host will start the game soon!</p>
          </div>
        ) : (
          <>
            <div className="player-riddle">
              <h2>{riddle.question}</h2>
              {riddle.hint && <p className="hint">Hint: {riddle.hint}</p>}
            </div>

            {revealedAnswer ? (
              <div className="answer-revealed">
                <p>The answer was:</p>
                <h3>{revealedAnswer}</h3>
              </div>
            ) : submitted ? (
              <div className="submitted-message">
                <p>Answer submitted!</p>
                <p className="your-answer">Your answer: <strong>{answer}</strong></p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="answer-form">
                <input
                  type="text"
                  placeholder="Your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={100}
                  autoFocus
                  disabled={timeLeft === 0}
                />
                <button type="submit" disabled={!answer.trim() || timeLeft === 0}>
                  Submit
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
