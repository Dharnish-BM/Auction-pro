import { format } from 'date-fns';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Calendar, ChevronRight, Clock, MapPin, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '../components/common/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { matchService } from '../services/matchService.js';

export const Matches = () => {
  const { isAdmin } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await matchService.getAll();
        setMatches(response.data);
      } catch (error) {
        console.error('Failed to fetch matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'setup':
        return 'text-gray-300 bg-gray-300/10';
      case 'auction':
        return 'text-orange-400 bg-orange-400/10';
      case 'live':
        return 'text-neon-green bg-neon-green/10';
      case 'innings_break':
        return 'text-gold bg-gold/10';
      case 'completed':
        return 'text-neon-blue bg-neon-blue/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Matches</h1>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Matches</h1>
          <p className="text-gray-400">View all scheduled fixtures</p>
        </div>
        {isAdmin() && (
          <Link
            to="/admin/matches"
            className="px-5 py-2 rounded-lg bg-neon-green text-sports-darker font-semibold hover:shadow-neon transition-all"
          >
            New Match
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {matches.map((match, index) => (
          <motion.div
            key={match._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={`/matches/${match._id}?tab=setup`}>
              <div className="sports-card card-hover group">
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(match.status)}`}>
                    {match.status === 'live' && (
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-neon-green rounded-full mr-2 animate-pulse" />
                        Live
                      </span>
                    )}
                    {match.status !== 'live' && match.status.replace('_', ' ')}
                  </span>
                  {match.status === 'live' && (
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                  )}
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
                      style={{ backgroundColor: match.teamA?.color || '#333' }}
                    >
                      {match.teamA?.name?.charAt(0)}
                    </div>
                    <span className="text-white font-semibold">{match.teamA?.name}</span>
                  </div>
                  
                  <span className="text-gray-500 font-bold">VS</span>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-semibold">{match.teamB?.name}</span>
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
                      style={{ backgroundColor: match.teamB?.color || '#333' }}
                    >
                      {match.teamB?.name?.charAt(0)}
                    </div>
                  </div>
                </div>

                {/* Match Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{format(new Date(match.date), 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{match.time}</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{match.location}</span>
                  </div>
                </div>

                {/* Winner (if completed) */}
                {match.status === 'completed' && match.winner && (
                  <div className="mt-4 pt-4 border-t border-sports-border flex items-center text-gold">
                    <Trophy className="w-4 h-4 mr-2" />
                    <span>Winner: {match.winner.name}</span>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {matches.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No matches scheduled</p>
        </div>
      )}
    </div>
  );
};
