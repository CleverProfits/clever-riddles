export default function RiddleDisplay({ riddle, showAnswer }) {
  if (!riddle) {
    return (
      <div className="riddle-display empty">
        <p className="riddle-placeholder">Click "New Riddle" to get started!</p>
      </div>
    );
  }

  return (
    <div className="riddle-display">
      <div className="riddle-question">
        <h2>{riddle.question}</h2>
      </div>

      {riddle.hint && (
        <div className="riddle-hint">
          <span className="hint-label">Hint:</span> {riddle.hint}
        </div>
      )}

      <div className={`riddle-answer ${showAnswer ? 'revealed' : ''}`}>
        {showAnswer ? (
          <div className="answer-content">
            <span className="answer-label">Answer:</span>
            <span className="answer-text">{riddle.answer}</span>
          </div>
        ) : (
          <div className="answer-hidden">
            Answer hidden
          </div>
        )}
      </div>
    </div>
  );
}
