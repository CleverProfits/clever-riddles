import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HostView from './components/HostView';
import PlayerView from './components/PlayerView';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HostView />} />
          <Route path="/join/:code" element={<PlayerView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
