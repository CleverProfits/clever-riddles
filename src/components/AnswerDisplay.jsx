import { useState, useEffect } from 'react';

const FONTS = [
  'Georgia, serif',
  'Arial, sans-serif',
  'Courier New, monospace',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
  'Impact, sans-serif',
  'Comic Sans MS, cursive',
  'Palatino Linotype, serif',
];

const SIZES = ['1rem', '1.25rem', '1.5rem', '1.75rem', '2rem'];
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

export default function AnswerDisplay({ answers }) {
  const [displayAnswers, setDisplayAnswers] = useState([]);

  useEffect(() => {
    // Add new answers with random styling
    const newAnswers = answers.map((a) => ({
      ...a,
      font: FONTS[Math.floor(Math.random() * FONTS.length)],
      size: SIZES[Math.floor(Math.random() * SIZES.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    setDisplayAnswers(newAnswers);
  }, [answers]);

  if (displayAnswers.length === 0) {
    return (
      <div className="answer-display empty">
        <p>Waiting for answers...</p>
      </div>
    );
  }

  return (
    <div className="answer-display">
      {displayAnswers.map((a) => (
        <div
          key={a.id}
          className="submitted-answer"
          style={{
            fontFamily: a.font,
            fontSize: a.size,
            color: a.color,
          }}
        >
          <span className="player-name">{a.playerName}:</span>
          <span className="player-answer">{a.answer}</span>
        </div>
      ))}
    </div>
  );
}
