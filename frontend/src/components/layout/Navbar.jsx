import { AnimatePresence, motion } from 'framer-motion';
import {
    Calendar,
    Gavel,
    LayoutDashboard,
    LogOut, Menu,
    Settings,
    Shield,
    Trophy,
    UserCircle,
    Users,
    X
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export const Navbar = () => {
  const { user, isAuthenticated, logout, isAdmin, isCaptain } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/', label: 'Home', icon: Trophy, public: true },
    { path: '/auction', label: 'Auction', icon: Gavel, auth: true },
    { path: '/teams', label: 'Teams', icon: Users, auth: true },
    { path: '/matches', label: 'Matches', icon: Calendar, auth: true },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true },
  ];

  const adminLinks = [
    { path: '/admin/players', label: 'Players', icon: UserCircle },
    { path: '/admin/teams', label: 'Teams', icon: Shield },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/matches', label: 'Matches', icon: Calendar },
  ];

  const isActive = (path) => location.pathname === path;
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {/* Main Navbar */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-sports-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-green to-emerald-600 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-sports-darker" />
                </div>
                <span className="text-xl font-bold gradient-text hidden sm:block">
                  TurfAuction Pro
                </span>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                if (link.auth && !isAuthenticated) return null;
                if (link.public === false && !isAuthenticated) return null;
                
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive(link.path)
                        ? 'bg-neon-green/10 text-neon-green'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                );
              })}

              {/* Admin Link - Only show one link to admin section */}
              {isAdmin() && (
                <Link
                  to="/admin/players"
                  className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isAdminPage
                      ? 'bg-gold/10 text-gold'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Admin</span>
                </Link>
              )}
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-green to-emerald-600 flex items-center justify-center">
                      <span className="text-sports-darker font-semibold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden lg:block">
                      <p className="font-medium text-white">{user?.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-medium bg-neon-green text-sports-darker rounded-lg hover:shadow-neon transition-all duration-200"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass-strong border-t border-sports-border"
            >
              <div className="px-4 py-4 space-y-2">
                {navLinks.map((link) => {
                  if (link.auth && !isAuthenticated) return null;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive(link.path)
                          ? 'bg-neon-green/10 text-neon-green'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  );
                })}

                {isAdmin() && (
                  <Link
                    to="/admin/players"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isAdminPage
                        ? 'bg-gold/10 text-gold'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Admin</span>
                  </Link>
                )}

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Admin Sub-Navbar */}
      {isAdmin() && isAdminPage && (
        <div className="bg-sports-card border-b border-sports-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-1 py-2 overflow-x-auto">
              <span className="text-xs text-gray-500 uppercase tracking-wider mr-4 hidden sm:block">
                Admin Panel
              </span>
              {adminLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                      isActive(link.path)
                        ? 'bg-gold/10 text-gold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
