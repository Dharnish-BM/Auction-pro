import { motion } from 'framer-motion';
import {
    Activity,
    ArrowLeft,
    Target,
    Trophy,
    User,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader } from '../components/common/Loader.jsx';
import { teamService } from '../services/teamService.js';

export const TeamDetails = () => {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const [teamRes, squadRes] = await Promise.all([
          teamService.getById(id),
          teamService.getSquad(id)
        ]);
        setTeam(teamRes.data);
        setSquad(squadRes.data);
      } catch (error) {
        console.error('Failed to fetch team data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-400">Team not found</p>
      </div>
    );
  }

  const roleIcons = {
    'Batsman': Target,
    'Bowler': Activity,
    'All-Rounder': Trophy,
    'Wicket-Keeper': User
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link to="/teams" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Teams
      </Link>

      {/* Team Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sports-card mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div 
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold"
              style={{ backgroundColor: team.color }}
            >
              {team.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{team.name}</h1>
              <p className="text-gray-400">Captain: {team.captain?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{team.players?.length || 0}</p>
              <p className="text-sm text-gray-400">Players</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gold">
                ₹{team.remainingBudget.toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">Remaining</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neon-green">
                ₹{team.totalBudget.toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">Total Budget</p>
            </div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Budget Used</span>
            <span className="text-white">
              ₹{(team.totalBudget - team.remainingBudget).toLocaleString()} / ₹{team.totalBudget.toLocaleString()}
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
      </motion.div>

      {/* Squad by Role */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Squad</h2>
        
        {squad && Object.entries(squad.squad).map(([role, players]) => {
          if (players.length === 0) return null;
          const RoleIcon = roleIcons[role] || User;
          
          return (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sports-card"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                  <RoleIcon className="w-5 h-5 text-neon-green" />
                </div>
                <h3 className="text-lg font-semibold text-white">{role}s</h3>
                <span className="px-2 py-1 rounded-full bg-sports-border text-sm text-gray-400">
                  {players.length}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player) => (
                  <div
                    key={player._id}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-sports-border/50"
                  >
                    <div className="w-12 h-12 rounded-xl bg-sports-border flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{player.name}</p>
                      <p className="text-gold text-sm">
                        ₹{player.soldPrice?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {squad?.totalPlayers === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No players in squad yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
