import { motion } from 'framer-motion';
import { ChevronRight, Trophy, Users, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '../components/common/Loader.jsx';
import { teamService } from '../services/teamService.js';

export const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await teamService.getAll();
        setTeams(response.data);
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Teams</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Teams</h1>
        <p className="text-gray-400">View all team compositions and budgets</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team, index) => (
          <motion.div
            key={team._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={`/teams/${team._id}`}>
              <div className="sports-card card-hover group">
                {/* Team Header */}
                <div className="flex items-center space-x-4 mb-6">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-neon-green transition-colors">
                      {team.name}
                    </h3>
                    <p className="text-gray-400 text-sm">Captain: {team.captain?.name}</p>
                  </div>
                </div>

                {/* Team Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 rounded-lg bg-sports-border/50">
                    <Users className="w-5 h-5 text-neon-green mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{team.players?.length || 0}</p>
                    <p className="text-xs text-gray-400">Players</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-sports-border/50">
                    <Wallet className="w-5 h-5 text-gold mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">
                      ₹{(team.totalBudget / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-gray-400">Budget</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-sports-border/50">
                    <Trophy className="w-5 h-5 text-neon-blue mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{team.matchesWon || 0}</p>
                    <p className="text-xs text-gray-400">Wins</p>
                  </div>
                </div>

                {/* Remaining Budget */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Remaining Budget</span>
                    <span className="text-white">
                      ₹{team.remainingBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-sports-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(team.remainingBudget / team.totalBudget) * 100}%` }}
                      className="h-full bg-gradient-to-r from-neon-green to-emerald-500"
                    />
                  </div>
                </div>

                {/* View Squad Link */}
                <div className="flex items-center justify-between text-neon-green">
                  <span className="text-sm font-medium">View Squad</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
