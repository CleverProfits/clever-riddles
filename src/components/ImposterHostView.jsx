import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import ShareGame from './ShareGame';

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export default function ImposterHostView() {
  const [socket, setSocket] = useState(null);
  const [gameCode, setGameCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gamePhase, setGamePhase] = useState('lobby'); // lobby, playing, voting, results
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(0);
  const [category, setCategory] = useState(null);
  const [secretWord, setSecretWord] = useState(null);
  const [imposterId, setImposterId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [liveVoteResults, setLiveVoteResults] = useState([]);
  const [voteProgress, setVoteProgress] = useState({ total: 0, expected: 0 });
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurnName, setCurrentTurnName] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('game:playerJoined', ({ playerName }) => {
      setPlayers((prev) => [...prev, playerName]);
    });

    newSocket.on('game:imposterAnswerSubmitted', (submission) => {
      setAnswers((prev) => [...prev, submission]);
    });

    // Live vote updates with percentages
    newSocket.on('game:voteUpdate', ({ totalVotes, totalPlayers, results }) => {
      setVoteProgress({ total: totalVotes, expected: totalPlayers });
      setLiveVoteResults(results);
    });

    // Auto-advance to next round
    newSocket.on('game:autoNextRound', ({ currentRound }) => {
      setCurrentRound(currentRound);
    });

    // Auto-start voting phase
    newSocket.on('game:autoStartVoting', ({ participants }) => {
      setParticipantsList(participants);
      setGamePhase('voting');
      setLiveVoteResults([]);
      setVoteProgress({ total: 0, expected: participants.length });
      setCurrentTurnName(null);
    });

    // Turn updates
    newSocket.on('game:turnUpdate', ({ currentTurnName, currentRound, roundComplete }) => {
      setCurrentTurnName(currentTurnName);
      if (roundComplete) {
        setCurrentRound(currentRound);
      }
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('host:create', { gameType: 'imposter' }, (response) => {
        setGameCode(response.code);
      });
    }
  }, [socket]);

  const startGame = () => {
    if (players.length < 3) {
      setError('Need at least 3 players to start');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnswers([]);

    socket.emit('host:startImposter', { code: gameCode, totalRounds }, (response) => {
      setIsLoading(false);
      if (response.error) {
        setError(response.error);
        return;
      }
      setCategory(response.category);
      setSecretWord(response.secretWord);
      setImposterId(response.imposterId);
      setParticipantsList(response.participants);
      setTurnOrder(response.turnOrder);
      setCurrentTurnName(response.currentTurnName);
      setCurrentRound(1);
      setGamePhase('playing');
    });
  };

  const nextRound = () => {
    if (currentRound >= totalRounds) {
      // Start voting
      socket.emit('host:startVoting', { code: gameCode }, (response) => {
        if (response.error) {
          setError(response.error);
          return;
        }
        setGamePhase('voting');
        setVotes([]);
      });
    } else {
      socket.emit('host:nextImposterRound', { code: gameCode }, (response) => {
        if (response.error) {
          setError(response.error);
          return;
        }
        setCurrentRound(response.currentRound);
      });
    }
  };

  const revealResults = () => {
    socket.emit('host:revealImposter', { code: gameCode }, (response) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      setResults(response);
      setGamePhase('results');
    });
  };

  const playAgain = () => {
    setGamePhase('lobby');
    setCategory(null);
    setSecretWord(null);
    setImposterId(null);
    setCurrentRound(0);
    setAnswers([]);
    setVotes([]);
    setResults(null);
  };

  const joinUrl = gameCode ? `${window.location.origin}/imposter/join/${gameCode}` : '';

  // Group answers by round
  const answersByRound = answers.reduce((acc, ans) => {
    const r = ans.round || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(ans);
    return acc;
  }, {});

  return (
    <div className="host-view imposter-host">
      <header className="app-header">
        <Link to="/" className="home-btn">← Back to Games</Link>
        <img
          src="/cp-logo-wordmark-white.png"
          alt="CleverProfits"
          style={{ height: '32px', marginBottom: '8px' }}
        />
        <h1>Imposter</h1>
        {gameCode && (
          <div className="game-info">
            <ShareGame code={gameCode} joinUrl={joinUrl} />
            <div className="game-stats">
              <div className="players-count">{players.length} player(s) joined</div>
            </div>
          </div>
        )}
      </header>

      <main className="app-main">
        {error && <div className="error-message">{error}</div>}

        {gamePhase === 'lobby' && (
          <div className="imposter-lobby">
            <h2>Waiting for Players</h2>
            <div className="players-list">
              {players.map((name, i) => (
                <div key={i} className="player-tag">{name}</div>
              ))}
              {players.length === 0 && <p className="waiting-text">Share the code to invite players...</p>}
            </div>

            <div className="round-selector">
              <label>Number of Rounds:</label>
              <div className="round-options">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`round-btn ${totalRounds === n ? 'selected' : ''}`}
                    onClick={() => setTotalRounds(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={isLoading || players.length < 3}
              className="control-btn start-btn"
            >
              {isLoading ? 'Starting...' : 'Start Game'}
            </button>
            {players.length < 3 && players.length > 0 && (
              <p className="hint-text">Need at least 3 players to start</p>
            )}
          </div>
        )}

        {gamePhase === 'playing' && (
          <div className="imposter-playing">
            <div className="round-header">
              <h2>Round {currentRound} of {totalRounds}</h2>
              <div className="category-display">
                Category: <strong>{category}</strong>
              </div>
              <div className="secret-word">
                Secret Word: <strong>{secretWord}</strong>
              </div>
            </div>

            <div className="turn-order-display">
              <h4>Turn Order</h4>
              <div className="turn-list">
                {turnOrder.map((player, idx) => {
                  const hasSubmittedThisRound = answers.some(
                    a => a.round === currentRound && a.playerName === player.name
                  );
                  const isCurrentTurn = player.name === currentTurnName;
                  return (
                    <div
                      key={player.id}
                      className={`turn-item ${isCurrentTurn ? 'current' : ''} ${hasSubmittedThisRound ? 'done' : ''}`}
                    >
                      <span className="turn-number">{idx + 1}</span>
                      <span className="turn-name">{player.name}</span>
                      {hasSubmittedThisRound && <span className="turn-check">✓</span>}
                      {isCurrentTurn && !hasSubmittedThisRound && <span className="turn-arrow">◀</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="answers-section">
              <h3>Clues Submitted</h3>
              {Object.entries(answersByRound).map(([round, roundAnswers]) => (
                <div key={round} className="round-answers">
                  <h4>Round {round}</h4>
                  <div className="answer-list">
                    {roundAnswers.map((ans) => (
                      <div key={ans.id} className="answer-item imposter-answer">
                        <span className="player-name">{ans.playerName}:</span>
                        <span className="clue-text">{ans.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {answers.length === 0 && (
                <p className="waiting-text">Waiting for players to submit clues...</p>
              )}
            </div>
          </div>
        )}

        {gamePhase === 'voting' && (
          <div className="imposter-voting">
            <h2>Voting Phase</h2>
            <p>Players are voting for who they think the Imposter is...</p>

            <div className="vote-status">
              <p className="vote-progress">{voteProgress.total} / {voteProgress.expected} votes</p>
            </div>

            {liveVoteResults.length > 0 && (
              <div className="live-vote-results">
                {liveVoteResults.map((r) => (
                  <div key={r.playerId} className="live-vote-row">
                    <span className="vote-player-name">{r.playerName}</span>
                    <div className="vote-bar-container">
                      <div className="vote-bar" style={{ width: `${r.percentage}%` }} />
                    </div>
                    <span className="vote-percentage">{r.percentage}%</span>
                    <span className="vote-count-small">({r.votes})</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={revealResults}
              className="control-btn reveal-btn"
              disabled={voteProgress.total < voteProgress.expected}
            >
              Reveal Imposter
            </button>
          </div>
        )}

        {gamePhase === 'results' && results && (
          <div className="imposter-results">
            <h2>Results</h2>

            <div className="reveal-card">
              <div className="imposter-reveal">
                <span className="reveal-label">The Imposter was:</span>
                <span className="imposter-name">{results.imposterName}</span>
              </div>
              <div className="word-reveal">
                <span className="reveal-label">The secret word was:</span>
                <span className="secret-word-text">{results.secretWord}</span>
                <span className="category-text">({results.category})</span>
              </div>
            </div>

            <div className="vote-breakdown">
              <h3>Vote Breakdown</h3>
              {results.counts.map((c) => (
                <div
                  key={c.playerId}
                  className={`vote-row ${c.playerId === results.imposterId ? 'is-imposter' : ''}`}
                >
                  <span className="voted-name">{c.playerName}</span>
                  <span className="vote-count">{c.votes} vote(s)</span>
                  {c.playerId === results.imposterId && <span className="imposter-badge">IMPOSTER</span>}
                </div>
              ))}
            </div>

            <div className="result-verdict">
              {results.counts[0]?.playerId === results.imposterId ? (
                <p className="verdict win">The group found the Imposter!</p>
              ) : (
                <p className="verdict lose">The Imposter got away!</p>
              )}
            </div>

            <button onClick={playAgain} className="control-btn">
              Play Again
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Claude</p>
      </footer>
    </div>
  );
}
