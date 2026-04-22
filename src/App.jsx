import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import HostView from './components/HostView';
import PlayerView from './components/PlayerView';
import WYRHostView from './components/WYRHostView';
import WYRPlayerView from './components/WYRPlayerView';
import ImposterHostView from './components/ImposterHostView';
import ImposterPlayerView from './components/ImposterPlayerView';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/riddles" element={<HostView />} />
          <Route path="/riddles/join/:code" element={<PlayerView />} />
          <Route path="/wyr" element={<WYRHostView />} />
          <Route path="/wyr/join/:code" element={<WYRPlayerView />} />
          <Route path="/imposter" element={<ImposterHostView />} />
          <Route path="/imposter/join/:code" element={<ImposterPlayerView />} />
          {/* Legacy join route - detect game type */}
          <Route path="/join/:code" element={<PlayerView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
