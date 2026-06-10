import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Jogos' },
    { to: '/predictions', label: 'Meus Palpites' },
    { to: '/leaderboard', label: 'Pontuação' },
  ];

  if (profile?.is_admin) {
    navLinks.push({ to: '/admin', label: 'Admin' });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🏆</span>
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Bolão Copa 2026
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === link.to
                    ? 'bg-green-700 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <Link to="/profile" className="text-sm text-gray-400 hover:text-white transition">
                  {profile?.name}
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
