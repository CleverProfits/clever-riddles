const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
];

export default function TimerSelector({ selected, onSelect, disabled }) {
  return (
    <div className="timer-selector">
      <span className="timer-selector-label">Timer:</span>
      <div className="timer-presets">
        {PRESETS.map(({ label, seconds }) => (
          <button
            key={seconds}
            onClick={() => onSelect(seconds)}
            className={`preset-btn ${selected === seconds ? 'active' : ''}`}
            disabled={disabled}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
