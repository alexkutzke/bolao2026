import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Jogos' },
    { to: '/predictions', label: 'Meus Palpites' },
    { to: '/leaderboard', label: 'Pontuação' },
    { to: '/rules', label: 'Regras' },
  ];

  if (profile?.is_admin) {
    navLinks.push({ to: '/admin', label: 'Admin' });
  }

  const linkClass = (to: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      location.pathname === to
        ? 'bg-green-700 text-white'
        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0" onClick={() => setMenuOpen(false)}>
            <span className="text-2xl">🏆</span>
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent hidden sm:inline">
              Bolão Copa 2026
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={linkClass(link.to)}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop user section */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                <Link to="/profile" className="text-sm text-gray-400 hover:text-white transition">
                  {profile?.name}
                </Link>
                <button onClick={signOut} className="text-sm text-gray-400 hover:text-white transition">
                  Sair
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger + user name */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Link to="/profile" className="text-sm text-gray-400 truncate max-w-[100px]" onClick={() => setMenuOpen(false)}>
                {profile?.name}
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gray-900/95 backdrop-blur">
            <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={linkClass(link.to)}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-gray-800 my-2" />
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition text-left"
              >
                Sair
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
