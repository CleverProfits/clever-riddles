import { Link } from 'react-router-dom';

const GAMES = [
  {
    id: 'riddles',
    name: 'Clever Riddles',
    description: 'AI-generated riddles with timer. Players type their answers!',
    path: '/riddles',
    emoji: '🧩',
    color: '#9b59b6',
  },
  {
    id: 'wyr',
    name: 'Would You Rather',
    description: 'Funny, gross, and thought-provoking choices. Vote A or B!',
    path: '/wyr',
    emoji: '🤔',
    color: '#e74c3c',
  },
  {
    id: 'imposter',
    name: 'Imposter',
    description: 'One player is the Imposter who doesn\'t know the secret word. Find them!',
    path: '/imposter',
    emoji: '🕵️',
    color: '#2ecc71',
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Clever Games</h1>
        <p>AI-powered party games for groups</p>
      </header>

      <main className="game-grid">
        {GAMES.map((game) => (
          <Link key={game.id} to={game.path} className="game-card" style={{ '--accent': game.color }}>
            <span className="game-emoji">{game.emoji}</span>
            <h2>{game.name}</h2>
            <p>{game.description}</p>
          </Link>
        ))}
      </main>

      <footer className="home-footer">
        <p>Powered by Claude</p>
      </footer>
    </div>
  );
}
