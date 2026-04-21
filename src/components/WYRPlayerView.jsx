import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export default function WYRPlayerView() {
  const { code } = useParams();
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [wyr, setWyr] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [timerDuration, setTimerDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('game:wyr', ({ optionA, optionB, timerDuration: duration }) => {
      setWyr({ optionA, optionB });
      setTimerDuration(duration);
      setTimeLeft(duration);
      setSelectedOption(null);
      setSubmitted(false);
      setResults(null);
    });

    newSocket.on('game:results', ({ countA, countB }) => {
      setResults({ countA, countB });
    });

    newSocket.on('game:ended', () => {
      setGameEnded(true);
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!wyr || timeLeft <= 0 || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [wyr, timeLeft, submitted]);

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

  const handleVote = (option) => {
    if (submitted || !socket) return;
    setSelectedOption(option);
    socket.emit('player:submitAnswer', { code: code.toUpperCase(), answer: option });
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
          <h1>Would You Rather</h1>
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
            <button type="submit" disabled={!playerName.trim()}>Join Game</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="player-view wyr-player">
      <header className="player-header">
        <span className="player-name-badge">{playerName}</span>
        {wyr && <span className="player-timer">{timeLeft}s</span>}
      </header>

      <main className="player-main">
        {!wyr ? (
          <div className="waiting">
            <h2>Waiting for question...</h2>
            <p>The host will start the game soon!</p>
          </div>
        ) : (
          <>
            <h2 className="wyr-player-title">Would You Rather...</h2>

            {results ? (
              <div className="wyr-results">
                <div className="result-option">
                  <span className="result-label">A</span>
                  <p>{wyr.optionA}</p>
                  <div className="result-bar">
                    <div className="result-fill" style={{ width: `${results.countA + results.countB > 0 ? (results.countA / (results.countA + results.countB)) * 100 : 0}%` }} />
                  </div>
                  <span className="result-count">{results.countA} votes</span>
                </div>
                <div className="result-option">
                  <span className="result-label">B</span>
                  <p>{wyr.optionB}</p>
                  <div className="result-bar">
                    <div className="result-fill" style={{ width: `${results.countA + results.countB > 0 ? (results.countB / (results.countA + results.countB)) * 100 : 0}%` }} />
                  </div>
                  <span className="result-count">{results.countB} votes</span>
                </div>
              </div>
            ) : submitted ? (
              <div className="submitted-message">
                <p>Vote submitted!</p>
                <p className="your-answer">You chose: <strong>{selectedOption === 'A' ? wyr.optionA : wyr.optionB}</strong></p>
              </div>
            ) : (
              <div className="wyr-vote-buttons">
                <button
                  onClick={() => handleVote('A')}
                  disabled={timeLeft === 0}
                  className="vote-btn vote-a"
                >
                  <span className="vote-label">A</span>
                  <span className="vote-text">{wyr.optionA}</span>
                </button>
                <div className="vote-or">OR</div>
                <button
                  onClick={() => handleVote('B')}
                  disabled={timeLeft === 0}
                  className="vote-btn vote-b"
                >
                  <span className="vote-label">B</span>
                  <span className="vote-text">{wyr.optionB}</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
