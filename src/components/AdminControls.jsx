export default function AdminControls({
  onNewRiddle,
  onRevealAnswer,
  canReveal,
  isLoading,
  showAnswer,
}) {
  return (
    <div className="admin-controls">
      <button
        onClick={onNewRiddle}
        disabled={isLoading}
        className="control-btn new-riddle-btn"
      >
        {isLoading ? 'Loading...' : 'New Riddle'}
      </button>

      <button
        onClick={onRevealAnswer}
        disabled={showAnswer}
        className={`control-btn reveal-btn ${canReveal && !showAnswer ? 'highlight' : ''}`}
      >
        {showAnswer ? 'Answer Revealed' : 'Reveal Answer'}
      </button>
    </div>
  );
}
