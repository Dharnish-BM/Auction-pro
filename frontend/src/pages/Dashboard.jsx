import { motion } from 'framer-motion';
import {
    Activity,
    ArrowRight,
    Calendar,
    DollarSign,
    Gavel,
    Trophy, Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader } from '../components/common/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { matchService } from '../services/matchService.js';
import { playerService } from '../services/playerService.js';
import { teamService } from '../services/teamService.js';

export const Dashboard = () => {
  const { user, isAdmin, isCaptain } = useAuth();
  const [stats, setStats] = useState(null);
  const [team, setTeam] = useState(null);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch player stats
        const playerStats = await playerService.getStatsSummary();
        
        // Fetch upcoming matches
        const matches = await matchService.getUpcoming();
        
        // If captain, fetch team details
        let teamData = null;
        if (isCaptain() && user?.teamId) {
          const teamRes = await teamService.getById(user.teamId);
          teamData = teamRes.data;
        }

        setStats(playerStats.data);
        setUpcomingMatches(matches.data || []);
        setTeam(teamData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isCaptain, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Overview of your auction platform</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Users}
              label="Total Players"
              value={stats?.totalPlayers || 0}
              color="neon-green"
            />
            <StatCard
              icon={Trophy}
              label="Sold Players"
              value={stats?.soldPlayers || 0}
              color="gold"
            />
            <StatCard
              icon={DollarSign}
              label="Money Spent"
              value={`₹${(stats?.totalMoneySpent || 0).toLocaleString()}`}
              color="neon-blue"
            />
            <StatCard
              icon={Activity}
              label="Unsold Players"
              value={stats?.unsoldPlayers || 0}
              color="purple"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickActionCard
              icon={Gavel}
              title="Start Auction"
              description="Begin a new player auction"
              to="/auction"
              color="neon-green"
            />
            <QuickActionCard
              icon={Users}
              title="Manage Players"
              description="Add or edit player profiles"
              to="/admin/players"
              color="gold"
            />
            <QuickActionCard
              icon={Calendar}
              title="Schedule Matches"
              description="Create upcoming fixtures"
              to="/matches"
              color="neon-blue"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Captain Dashboard
  if (isCaptain()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Captain Dashboard</h1>
            <p className="text-gray-400">Manage your team and bidding</p>
          </div>

          {/* Team Budget Card */}
          {team && (
            <div className="sports-card mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                    <p className="text-gray-400">Your Team</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Remaining Budget</p>
                  <p className="text-3xl font-bold gradient-text-gold">
                    ₹{team.remainingBudget.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Budget Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Budget Used</span>
                  <span className="text-white">
                    {Math.round(((team.totalBudget - team.remainingBudget) / team.totalBudget) * 100)}%
                  </span>
                </div>
                <div className="h-3 bg-sports-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((team.totalBudget - team.remainingBudget) / team.totalBudget) * 100}%` }}
                    className="h-full bg-gradient-to-r from-neon-green to-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-sports-border/30">
                  <p className="text-2xl font-bold text-white">{team.players?.length || 0}</p>
                  <p className="text-sm text-gray-400">Players</p>
                </div>
                <div className="p-4 rounded-lg bg-sports-border/30">
                  <p className="text-2xl font-bold text-white">
                    ₹{(team.totalBudget - team.remainingBudget).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">Spent</p>
                </div>
                <div className="p-4 rounded-lg bg-sports-border/30">
                  <p className="text-2xl font-bold text-white">
                    ₹{team.totalBudget.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">Total</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            <QuickActionCard
              icon={Gavel}
              title="Join Auction"
              description="Bid on available players"
              to="/auction"
              color="neon-green"
            />
            <QuickActionCard
              icon={Calendar}
              title="Upcoming Matches"
              description={`${upcomingMatches.length} matches scheduled`}
              to="/matches"
              color="neon-blue"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Viewer Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.name}</h1>
          <p className="text-gray-400">View auctions and matches</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <QuickActionCard
            icon={Gavel}
            title="Live Auction"
            description="Watch the auction in real-time"
            to="/auction"
            color="neon-green"
          />
          <QuickActionCard
            icon={Trophy}
            title="View Teams"
            description="See all team compositions"
            to="/teams"
            color="gold"
          />
        </div>
      </motion.div>
    </div>
  );
};

// Helper Components
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    'neon-green': 'text-neon-green bg-neon-green/10',
    'gold': 'text-gold bg-gold/10',
    'neon-blue': 'text-neon-blue bg-neon-blue/10',
    'purple': 'text-purple-400 bg-purple-400/10'
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="sports-card"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </motion.div>
  );
};

const QuickActionCard = ({ icon: Icon, title, description, to, color }) => {
  const colorClasses = {
    'neon-green': 'group-hover:text-neon-green group-hover:bg-neon-green/10',
    'gold': 'group-hover:text-gold group-hover:bg-gold/10',
    'neon-blue': 'group-hover:text-neon-blue group-hover:bg-neon-blue/10'
  };

  return (
    <Link to={to} className="group">
      <motion.div
        whileHover={{ y: -4 }}
        className="sports-card card-hover"
      >
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl bg-sports-border flex items-center justify-center transition-colors ${colorClasses[color]}`}>
            <Icon className="w-6 h-6 text-gray-400 transition-colors" />
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-lg font-semibold text-white mt-4 mb-1">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </motion.div>
    </Link>
  );
};
