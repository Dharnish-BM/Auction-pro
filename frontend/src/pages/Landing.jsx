import { motion } from 'framer-motion';
import {
    Calendar,
    ChevronRight,
    Gavel,
    Shield,
    Target,
    TrendingUp,
    Trophy, Users,
    Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const Landing = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Gavel,
      title: 'Live Auctions',
      description: 'Real-time bidding with countdown timers and instant updates'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Create teams, assign captains, and manage budgets'
    },
    {
      icon: Trophy,
      title: 'Player Profiles',
      description: 'Detailed stats, roles, and performance history'
    },
    {
      icon: Calendar,
      title: 'Match Scheduling',
      description: 'Schedule matches and track fixtures easily'
    },
    {
      icon: Target,
      title: 'Live Scoreboard',
      description: 'Real-time scoring with ball-by-ball updates'
    },
    {
      icon: TrendingUp,
      title: 'Analytics',
      description: 'Track spending, team composition, and auction history'
    }
  ];

  return (
    <div className="min-h-screen bg-sports-dark">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sports-dark via-sports-card to-sports-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neon-green/10 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-neon-green/10 border border-neon-green/20 mb-8">
                <Zap className="w-4 h-4 text-neon-green" />
                <span className="text-sm text-neon-green font-medium">The Ultimate Cricket Auction Platform</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6"
            >
              <span className="text-white">Build Your</span>
              <br />
              <span className="gradient-text">Dream Team</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto mb-10"
            >
              TurfAuction Pro is the premier platform for conducting cricket player auctions 
              among friends. Bid, build squads, and compete in style.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="group flex items-center space-x-2 px-8 py-4 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all duration-300"
                >
                  <span>Go to Dashboard</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="group flex items-center space-x-2 px-8 py-4 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all duration-300"
                  >
                    <span>Get Started</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 border border-sports-border text-white font-semibold rounded-xl hover:bg-white/5 transition-all duration-300"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-sports-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '20+', label: 'Players' },
              { value: '4', label: 'Teams' },
              { value: '100K', label: 'Budget' },
              { value: '24/7', label: 'Support' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-bold gradient-text-gold mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              A complete solution for managing cricket auctions from start to finish
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="sports-card card-hover group"
                >
                  <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center mb-4 group-hover:bg-neon-green/20 transition-colors">
                    <Icon className="w-6 h-6 text-neon-green" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-green/5 to-gold/5" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-16 h-16 text-neon-green mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Start Your Auction?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join thousands of cricket enthusiasts and create unforgettable auction experiences
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all duration-300"
            >
              <span>Create Free Account</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-sports-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-6 h-6 text-neon-green" />
              <span className="text-lg font-bold text-white">TurfAuction Pro</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 TurfAuction Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
