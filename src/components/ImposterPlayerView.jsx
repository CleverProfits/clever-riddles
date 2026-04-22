import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export default function ImposterPlayerView() {
  const { code } = useParams();
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);

  // Game state
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting, playing, voting, results
  const [isImposter, setIsImposter] = useState(false);
  const [category, setCategory] = useState(null);
  const [secretWord, setSecretWord] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(3);
  const [clue, setClue] = useState('');
  const [answers, setAnswers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedVote, setSelectedVote] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState(null);
  const [turnOrder, setTurnOrder] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [hasSubmittedThisRound, setHasSubmittedThisRound] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('game:imposterStart', (data) => {
      setCategory(data.category);
      setSecretWord(data.secretWord);
      setIsImposter(data.isImposter);
      setCurrentRound(data.currentRound);
      setTotalRounds(data.totalRounds);
      setTurnOrder(data.turnOrder);
      setIsMyTurn(data.isYourTurn);
      setHasSubmittedThisRound(false);
      setGamePhase('playing');
      setClue('');
    });

    newSocket.on('game:turnUpdate', ({ isYourTurn, currentRound, roundComplete }) => {
      setIsMyTurn(isYourTurn);
      if (roundComplete) {
        setCurrentRound(currentRound);
        setHasSubmittedThisRound(false);
      }
    });

    newSocket.on('game:imposterAnswerSubmitted', (submission) => {
      setAnswers((prev) => [...prev, submission]);
    });

    newSocket.on('game:votingStart', ({ participants }) => {
      setParticipants(participants);
      setGamePhase('voting');
      setSelectedVote(null);
      setHasVoted(false);
    });

    newSocket.on('game:imposterRevealed', (data) => {
      setResults(data);
      setGamePhase('results');
    });

    newSocket.on('game:ended', () => {
      setGamePhase('waiting');
      setCategory(null);
      setSecretWord(null);
      setIsImposter(false);
      setAnswers([]);
      setResults(null);
    });

    return () => newSocket.close();
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    socket.emit('player:join', { code: code.toUpperCase(), playerName: playerName.trim() }, (response) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      if (response.gameType !== 'imposter') {
        setError('This is not an Imposter game');
        return;
      }
      setJoined(true);
    });
  };

  const submitClue = (e) => {
    e.preventDefault();
    if (!clue.trim() || !isMyTurn || hasSubmittedThisRound) return;

    socket.emit('player:submitImposterAnswer', {
      code: code.toUpperCase(),
      answer: clue.trim(),
      round: currentRound,
    }, (response) => {
      if (response?.success) {
        setHasSubmittedThisRound(true);
        setIsMyTurn(false);
        setClue('');
      }
    });
  };

  const submitVote = () => {
    if (!selectedVote || hasVoted) return;

    socket.emit('player:submitVote', { code: code.toUpperCase(), suspectId: selectedVote }, (response) => {
      if (response.success) {
        setHasVoted(true);
      }
    });
  };

  if (!joined) {
    return (
      <div className="player-view imposter-player">
        <div className="join-screen">
          <h1>Join Imposter Game</h1>
          <p className="game-code">Game Code: {code?.toUpperCase()}</p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleJoin}>
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
    <div className="player-view imposter-player">
      {gamePhase === 'waiting' && (
        <div className="waiting-screen">
          <h2>Waiting for Game to Start...</h2>
          <p>The host will start the game soon.</p>
          <div className="player-badge">Playing as: {playerName}</div>
        </div>
      )}

      {gamePhase === 'playing' && (
        <div className="playing-screen">
          <div className="round-info">
            Round {currentRound} of {totalRounds}
          </div>

          <div className="role-card">
            <div className="category-label">Category: {category}</div>
            {isImposter ? (
              <div className="imposter-role">
                <div className="role-badge imposter">YOU ARE THE IMPOSTER</div>
                <p className="imposter-hint">Blend in! Give vague clues that fit the category.</p>
              </div>
            ) : (
              <div className="player-role">
                <div className="secret-word-display">
                  <span className="word-label">Secret Word:</span>
                  <span className="word-value">{secretWord}</span>
                </div>
                <p className="player-hint">Give a clue that shows you know the word without being too obvious!</p>
              </div>
            )}
          </div>

          {isMyTurn && !hasSubmittedThisRound ? (
            <div className="your-turn-notice">
              <p className="turn-alert">It's YOUR turn!</p>
              <form onSubmit={submitClue} className="clue-form">
                <input
                  type="text"
                  placeholder="Enter your clue..."
                  value={clue}
                  onChange={(e) => setClue(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
                <button type="submit" disabled={!clue.trim()}>
                  Submit Clue
                </button>
              </form>
            </div>
          ) : (
            <div className="waiting-turn">
              {hasSubmittedThisRound ? (
                <p>Clue submitted! Waiting for others...</p>
              ) : (
                <p>Waiting for your turn...</p>
              )}
            </div>
          )}

          <div className="turn-order-player">
            <h4>Turn Order</h4>
            <div className="turn-list-player">
              {turnOrder.map((player, idx) => {
                const hasGone = answers.some(
                  a => a.round === currentRound && a.playerName === player.name
                );
                return (
                  <div key={player.id} className={`turn-pip ${hasGone ? 'done' : ''}`}>
                    {idx + 1}. {player.name} {hasGone && '✓'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {gamePhase === 'voting' && (
        <div className="voting-screen">
          <h2>Who is the Imposter?</h2>
          <p>Vote for the player you think is the Imposter</p>

          {hasVoted ? (
            <div className="voted-notice">
              <p>Vote submitted! Waiting for others...</p>
            </div>
          ) : (
            <>
              <div className="vote-options">
                {participants
                  .filter((p) => p.id !== socket?.id) // Can't vote for yourself
                  .map((p) => (
                    <button
                      key={p.id}
                      className={`vote-option ${selectedVote === p.id ? 'selected' : ''}`}
                      onClick={() => setSelectedVote(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
              </div>

              <button
                onClick={submitVote}
                disabled={!selectedVote}
                className="submit-vote-btn"
              >
                Submit Vote
              </button>
            </>
          )}
        </div>
      )}

      {gamePhase === 'results' && results && (
        <div className="results-screen">
          <h2>Game Over!</h2>

          <div className="reveal-info">
            <div className="imposter-reveal">
              <span className="label">The Imposter was:</span>
              <span className="value imposter-name">{results.imposterName}</span>
            </div>
            <div className="word-reveal">
              <span className="label">The word was:</span>
              <span className="value">{results.secretWord}</span>
              <span className="category">({results.category})</span>
            </div>
          </div>

          {isImposter ? (
            results.counts[0]?.playerId === results.imposterId ? (
              <p className="verdict lose">You were caught!</p>
            ) : (
              <p className="verdict win">You got away!</p>
            )
          ) : (
            results.counts[0]?.playerId === results.imposterId ? (
              <p className="verdict win">Your team found the Imposter!</p>
            ) : (
              <p className="verdict lose">The Imposter escaped!</p>
            )
          )}

          <p className="waiting-again">Waiting for host to start next game...</p>
        </div>
      )}
    </div>
  );
}
