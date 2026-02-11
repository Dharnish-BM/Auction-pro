import { motion } from 'framer-motion';
import {
    Edit2,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    User,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader } from '../../components/common/Loader.jsx';
import { playerService } from '../../services/playerService.js';

export const Players = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Batsman',
    basePrice: '',
    battingStyle: '',
    bowlingStyle: '',
    stats: {
      matches: 0,
      runs: 0,
      wickets: 0
    }
  });

  const roles = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
  const battingStyles = ['Right-handed', 'Left-handed'];
  const bowlingStyles = [
    'Right-arm Fast', 'Right-arm Medium', 'Right-arm Spin',
    'Left-arm Fast', 'Left-arm Medium', 'Left-arm Spin'
  ];

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await playerService.getAll();
      setPlayers(response.data);
    } catch (error) {
      toast.error('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await playerService.update(editingPlayer._id, formData);
        toast.success('Player updated successfully');
      } else {
        await playerService.create(formData);
        toast.success('Player created successfully');
      }
      setShowAddModal(false);
      setEditingPlayer(null);
      resetForm();
      fetchPlayers();
    } catch (error) {
      toast.error(error.message || 'Failed to save player');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this player?')) return;
    try {
      await playerService.delete(id);
      toast.success('Player deleted successfully');
      fetchPlayers();
    } catch (error) {
      toast.error(error.message || 'Failed to delete player');
    }
  };

  const handleReset = async (id) => {
    if (!window.confirm('Reset this player\'s auction status?')) return;
    try {
      await playerService.resetStatus(id);
      toast.success('Player status reset');
      fetchPlayers();
    } catch (error) {
      toast.error(error.message || 'Failed to reset player');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'Batsman',
      basePrice: '',
      battingStyle: '',
      bowlingStyle: '',
      stats: { matches: 0, runs: 0, wickets: 0 }
    });
  };

  const openEditModal = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      role: player.role,
      basePrice: player.basePrice,
      battingStyle: player.battingStyle,
      bowlingStyle: player.bowlingStyle,
      stats: player.stats
    });
    setShowAddModal(true);
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || player.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getStatusBadge = (player) => {
    if (player.isSold) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-neon-green/10 text-neon-green">
          Sold
        </span>
      );
    }
    if (player.auctionStatus === 'unsold') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
          Unsold
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
        Pending
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Player Management</h1>
          <p className="text-gray-400">Manage player profiles and auction status</p>
        </div>
        <button
          onClick={() => {
            setEditingPlayer(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 px-6 py-3 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Player</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="sm:w-48"
        >
          <option value="">All Roles</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {/* Players Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size="large" />
        </div>
      ) : (
        <div className="sports-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sports-border">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Player</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Role</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Base Price</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player, index) => (
                  <motion.tr
                    key={player._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-sports-border/50 hover:bg-white/5"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-sports-border flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <span className="text-white font-medium">{player.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-full bg-sports-border text-sm text-gray-300">
                        {player.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white">
                      ₹{player.basePrice.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(player)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(player)}
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {player.isSold && (
                          <button
                            onClick={() => handleReset(player._id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-neon-green hover:bg-neon-green/10 transition-colors"
                            title="Reset Status"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(player._id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPlayers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No players found</p>
            </div>
          )}
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
                {editingPlayer ? 'Edit Player' : 'Add New Player'}
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
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Base Price (₹)</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value) || '' })}
                    required
                    min="0"
                    step="1000"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Batting Style</label>
                  <select
                    value={formData.battingStyle}
                    onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Select...</option>
                    {battingStyles.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Bowling Style</label>
                  <select
                    value={formData.bowlingStyle}
                    onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Select...</option>
                    {bowlingStyles.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
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
                  className="px-6 py-2 bg-neon-green text-sports-darker font-semibold rounded-lg hover:shadow-neon transition-all"
                >
                  {editingPlayer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
