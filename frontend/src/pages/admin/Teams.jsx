import { motion } from 'framer-motion';
import {
    Edit2,
    Plus,
    Trash2,
    Users,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader } from '../../components/common/Loader.jsx';
import { teamService } from '../../services/teamService.js';
import { userService } from '../../services/userService.js';

export const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [availableCaptains, setAvailableCaptains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    captain: '',
    totalBudget: 100000,
    color: '#00ff88'
  });

  const colors = [
    '#00ff88', '#ff0044', '#ffd700', '#ff6600', 
    '#00d4ff', '#a855f7', '#ff00ff', '#00ff00'
  ];

  useEffect(() => {
    fetchTeams();
    fetchAvailableCaptains();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await teamService.getAll();
      setTeams(response.data);
    } catch (error) {
      toast.error('Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCaptains = async () => {
    try {
      const response = await userService.getAvailableCaptains();
      setAvailableCaptains(response.data);
    } catch (error) {
      console.error('Failed to fetch captains:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await teamService.update(editingTeam._id, formData);
        toast.success('Team updated successfully');
      } else {
        await teamService.create(formData);
        toast.success('Team created successfully');
      }
      setShowAddModal(false);
      setEditingTeam(null);
      resetForm();
      fetchTeams();
      fetchAvailableCaptains();
    } catch (error) {
      toast.error(error.message || 'Failed to save team');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    try {
      await teamService.delete(id);
      toast.success('Team deleted successfully');
      fetchTeams();
      fetchAvailableCaptains();
    } catch (error) {
      toast.error(error.message || 'Failed to delete team');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      captain: '',
      totalBudget: 100000,
      color: '#00ff88'
    });
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      captain: team.captain?._id || '',
      totalBudget: team.totalBudget,
      color: team.color
    });
    setShowAddModal(true);
  };

  const openCreateModal = () => {
    setEditingTeam(null);
    resetForm();
    setShowAddModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
          <p className="text-gray-400">Create and manage teams</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-6 py-3 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Create Team</span>
        </button>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size="large" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, index) => (
            <motion.div
              key={team._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="sports-card"
            >
              {/* Team Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{team.name}</h3>
                    <p className="text-gray-400 text-sm">{team.captain?.name || 'No captain'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(team)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(team._id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Budget Info */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Budget</span>
                  <span className="text-white font-medium">₹{team.totalBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Remaining</span>
                  <span className="text-neon-green font-medium">₹{team.remainingBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Spent</span>
                  <span className="text-gold font-medium">₹{(team.totalBudget - team.remainingBudget).toLocaleString()}</span>
                </div>
              </div>

              {/* Budget Progress */}
              <div className="h-2 bg-sports-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-green to-emerald-500 transition-all"
                  style={{ width: `${((team.totalBudget - team.remainingBudget) / team.totalBudget) * 100}%` }}
                />
              </div>

              {/* Players Count */}
              <div className="mt-4 pt-4 border-t border-sports-border flex items-center justify-between">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{team.players?.length || 0} Players</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {teams.length === 0 && !loading && (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No teams created yet</p>
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
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Team Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full"
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Captain</label>
                <select
                  value={formData.captain}
                  onChange={(e) => setFormData({ ...formData, captain: e.target.value })}
                  required={!editingTeam}
                  className="w-full"
                >
                  <option value="">Select a captain...</option>
                  {editingTeam && (
                    <option value={editingTeam.captain?._id}>
                      {editingTeam.captain?.name} (Current)
                    </option>
                  )}
                  {availableCaptains.map(captain => (
                    <option key={captain._id} value={captain._id}>
                      {captain.name} ({captain.email})
                    </option>
                  ))}
                </select>
                {availableCaptains.length === 0 && !editingTeam && (
                  <p className="mt-2 text-sm text-red-400">
                    No available captains. Create captain users first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Total Budget (₹)</label>
                <input
                  type="number"
                  value={formData.totalBudget}
                  onChange={(e) => setFormData({ ...formData, totalBudget: parseInt(e.target.value) || 0 })}
                  required
                  min="0"
                  step="1000"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Team Color</label>
                <div className="grid grid-cols-4 gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-12 rounded-xl transition-all ${
                        formData.color === color ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
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
                  disabled={!formData.captain && !editingTeam}
                  className="px-6 py-2 bg-neon-green text-sports-darker font-semibold rounded-lg hover:shadow-neon transition-all disabled:opacity-50"
                >
                  {editingTeam ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
