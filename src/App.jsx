import { useState, useCallback } from 'react';
import RiddleDisplay from './components/RiddleDisplay';
import Timer from './components/Timer';
import TimerSelector from './components/TimerSelector';
import AdminControls from './components/AdminControls';
import './App.css';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

function App() {
  const [riddle, setRiddle] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [error, setError] = useState(null);

  const fetchRiddle = async () => {
    setIsLoading(true);
    setError(null);
    setShowAnswer(false);
    setTimerRunning(false);
    setTimerExpired(false);
    setTimerKey(prev => prev + 1);

    try {
      const res = await fetch(`${API_URL}/api/riddle`);
      if (!res.ok) throw new Error('Failed to fetch riddle');
      const data = await res.json();
      setRiddle(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching riddle:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimerExpire = useCallback(() => {
    setTimerRunning(false);
    setTimerExpired(true);
  }, []);

  const handleStartTimer = useCallback(() => {
    setTimerRunning(true);
  }, []);

  const handleRevealAnswer = () => {
    setShowAnswer(true);
    setTimerRunning(false);
  };

  const handleDurationChange = (seconds) => {
    setTimerDuration(seconds);
    setTimerKey(prev => prev + 1);
    setTimerRunning(false);
    setTimerExpired(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Clever Riddles</h1>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <RiddleDisplay riddle={riddle} showAnswer={showAnswer} />

        {riddle && (
          <div className="timer-section">
            <TimerSelector
              selected={timerDuration}
              onSelect={handleDurationChange}
              disabled={timerRunning}
            />
            <Timer
              key={timerKey}
              duration={timerDuration}
              onExpire={handleTimerExpire}
              isRunning={timerRunning}
              onStart={handleStartTimer}
            />
          </div>
        )}

        <AdminControls
          onNewRiddle={fetchRiddle}
          onRevealAnswer={handleRevealAnswer}
          canReveal={timerExpired}
          isLoading={isLoading}
          showAnswer={showAnswer}
        />
      </main>

      <footer className="app-footer">
        <p>Powered by Claude</p>
      </footer>
    </div>
  );
}

export default App;
