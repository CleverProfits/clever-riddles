import { useState, useEffect, useCallback } from 'react';

export default function Timer({ duration, onExpire, isRunning, onStart }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [hasStarted, setHasStarted] = useState(false);

  // Reset when duration changes
  useEffect(() => {
    setTimeLeft(duration);
    setHasStarted(false);
  }, [duration]);

  // Countdown logic
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onExpire]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / duration) * 100;
  const isExpired = timeLeft === 0;
  const isLow = timeLeft <= 10 && timeLeft > 0;

  const handleStart = () => {
    setHasStarted(true);
    onStart?.();
  };

  return (
    <div className="timer">
      <div
        className={`timer-display ${isExpired ? 'expired' : ''} ${isLow ? 'low' : ''}`}
      >
        {formatTime(timeLeft)}
      </div>
      <div className="timer-progress-bar">
        <div
          className={`timer-progress ${isExpired ? 'expired' : ''} ${isLow ? 'low' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {!hasStarted && !isRunning && (
        <button onClick={handleStart} className="start-timer-btn">
          Start Timer
        </button>
      )}
    </div>
  );
}
