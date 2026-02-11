import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
    Calendar,
    CheckCircle,
    Clock,
    Edit2,
    MapPin,
    Play,
    Plus,
    Trash2,
    Trophy,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader } from '../../components/common/Loader.jsx';
import { matchService } from '../../services/matchService.js';
import { teamService } from '../../services/teamService.js';

export const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startingMatch, setStartingMatch] = useState(null);

  const [formData, setFormData] = useState({
    teamA: '',
    teamB: '',
    date: '',
    time: '',
    location: '',
    oversPerInnings: 10
  });

  const [tossData, setTossData] = useState({
    tossWinner: '',
    tossDecision: 'bat'
  });

  useEffect(() => {
    fetchMatches();
    fetchTeams();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await matchService.getAll(params);
      setMatches(response.data);
    } catch (error) {
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await teamService.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMatch) {
        await matchService.update(editingMatch._id, formData);
        toast.success('Match updated successfully');
      } else {
        await matchService.create(formData);
        toast.success('Match created successfully');
      }
      setShowAddModal(false);
      setEditingMatch(null);
      resetForm();
      fetchMatches();
    } catch (error) {
      toast.error(error.message || 'Failed to save match');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    try {
      await matchService.delete(id);
      toast.success('Match deleted successfully');
      fetchMatches();
    } catch (error) {
      toast.error(error.message || 'Failed to delete match');
    }
  };

  const handleStartMatch = async (e) => {
    e.preventDefault();
    try {
      await matchService.start(startingMatch._id, tossData);
      toast.success('Match started successfully');
      setShowStartModal(false);
      setStartingMatch(null);
      fetchMatches();
    } catch (error) {
      toast.error(error.message || 'Failed to start match');
    }
  };

  const openStartModal = (match) => {
    setStartingMatch(match);
    setTossData({
      tossWinner: match.teamA._id,
      tossDecision: 'bat'
    });
    setShowStartModal(true);
  };

  const resetForm = () => {
    setFormData({
      teamA: '',
      teamB: '',
      date: '',
      time: '',
      location: '',
      oversPerInnings: 10
    });
  };

  const openEditModal = (match) => {
    setEditingMatch(match);
    setFormData({
      teamA: match.teamA._id,
      teamB: match.teamB._id,
      date: match.date.split('T')[0],
      time: match.time,
      location: match.location,
      oversPerInnings: match.oversPerInnings
    });
    setShowAddModal(true);
  };

  const openCreateModal = () => {
    setEditingMatch(null);
    resetForm();
    setShowAddModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return (
          <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neon-green/10 text-neon-green">
            <Calendar className="w-3 h-3 mr-1" />
            Upcoming
          </span>
        );
      case 'live':
        return (
          <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
            <span className="w-2 h-2 bg-red-400 rounded-full mr-1 animate-pulse" />
            Live
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Match Management</h1>
          <p className="text-gray-400">Create and manage matches</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-6 py-3 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Schedule Match</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            fetchMatches();
          }}
          className="sm:w-48"
        >
          <option value="">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size="large" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match, index) => (
            <motion.div
              key={match._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="sports-card"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                {getStatusBadge(match.status)}
                <div className="flex items-center space-x-1">
                  {match.status === 'upcoming' && (
                    <button
                      onClick={() => openStartModal(match)}
                      className="p-2 rounded-lg text-gray-400 hover:text-neon-green hover:bg-neon-green/10 transition-colors"
                      title="Start Match"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(match)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(match._id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Teams */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: match.teamA?.color || '#333' }}
                  >
                    {match.teamA?.name?.charAt(0)}
                  </div>
                  <span className="text-white font-medium text-sm">{match.teamA?.name}</span>
                </div>
                <span className="text-gray-500 text-xs font-bold">VS</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium text-sm">{match.teamB?.name}</span>
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
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
                  <span>{format(new Date(match.date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{match.time}</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="truncate">{match.location}</span>
                </div>
              </div>

              {/* Overs */}
              <div className="mt-4 pt-4 border-t border-sports-border flex items-center justify-between">
                <span className="text-gray-400 text-sm">{match.oversPerInnings} overs</span>
                {match.winner && (
                  <div className="flex items-center text-gold text-sm">
                    <Trophy className="w-4 h-4 mr-1" />
                    <span>{match.winner.name}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {matches.length === 0 && !loading && (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No matches found</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="sports-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingMatch ? 'Edit Match' : 'Schedule New Match'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Team A</label>
                  <select
                    value={formData.teamA}
                    onChange={(e) => setFormData({ ...formData, teamA: e.target.value })}
                    required
                    className="w-full"
                  >
                    <option value="">Select team...</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Team B</label>
                  <select
                    value={formData.teamB}
                    onChange={(e) => setFormData({ ...formData, teamB: e.target.value })}
                    required
                    className="w-full"
                  >
                    <option value="">Select team...</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="w-full"
                  placeholder="Enter match location"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Overs per Innings</label>
                <input
                  type="number"
                  value={formData.oversPerInnings}
                  onChange={(e) => setFormData({ ...formData, oversPerInnings: parseInt(e.target.value) || 10 })}
                  required
                  min="1"
                  max="50"
                  className="w-full"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-neon-green text-sports-darker font-semibold rounded-lg hover:shadow-neon transition-all"
                >
                  {editingMatch ? 'Update' : 'Schedule'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Start Match Modal */}
      {showStartModal && startingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="sports-card w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Start Match</h2>
              <button
                onClick={() => setShowStartModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 text-center">
              <p className="text-gray-400 mb-2">{startingMatch.teamA.name} vs {startingMatch.teamB.name}</p>
              <p className="text-sm text-gray-500">{format(new Date(startingMatch.date), 'MMM d, yyyy')} at {startingMatch.time}</p>
            </div>

            <form onSubmit={handleStartMatch} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Toss Winner</label>
                <select
                  value={tossData.tossWinner}
                  onChange={(e) => setTossData({ ...tossData, tossWinner: e.target.value })}
                  required
                  className="w-full"
                >
                  <option value={startingMatch.teamA._id}>{startingMatch.teamA.name}</option>
                  <option value={startingMatch.teamB._id}>{startingMatch.teamB.name}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Toss Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTossData({ ...tossData, tossDecision: 'bat' })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      tossData.tossDecision === 'bat'
                        ? 'border-neon-green bg-neon-green/10 text-white'
                        : 'border-sports-border text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Bat First
                  </button>
                  <button
                    type="button"
                    onClick={() => setTossData({ ...tossData, tossDecision: 'bowl' })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      tossData.tossDecision === 'bowl'
                        ? 'border-neon-green bg-neon-green/10 text-white'
                        : 'border-sports-border text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Bowl First
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-neon-green text-sports-darker font-semibold rounded-lg hover:shadow-neon transition-all"
                >
                  Start Match
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
