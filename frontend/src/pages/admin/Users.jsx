import { motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle,
    Edit2,
    Eye,
    Plus,
    Power,
    Search,
    Shield,
    User,
    UserCircle,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader } from '../../components/common/Loader.jsx';
import { authService } from '../../services/authService.js';
import { userService } from '../../services/userService.js';

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'captain'
  });

  const roles = [
    { value: 'admin', label: 'Admin', icon: Shield, color: 'text-red-400' },
    { value: 'captain', label: 'Captain', icon: UserCircle, color: 'text-neon-green' },
    { value: 'viewer', label: 'Viewer', icon: Eye, color: 'text-gray-400' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll();
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const { password, ...updateData } = formData;
        await userService.update(editingUser._id, updateData);
        toast.success('User updated successfully');
      } else {
        await authService.register(formData);
        toast.success('User created successfully');
      }
      setShowAddModal(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to save user');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await userService.deactivate(id);
      toast.success('User deactivated successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to deactivate user');
    }
  };

  const handleActivate = async (id) => {
    try {
      await userService.activate(id);
      toast.success('User activated successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to activate user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('WARNING: This will permanently delete the user. This action cannot be undone.\n\nAre you sure?')) return;
    try {
      await userService.delete(id);
      toast.success('User permanently deleted');
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'captain'
    });
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowAddModal(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setShowAddModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    const Icon = roleConfig?.icon || User;
    return (
      <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-sports-border ${roleConfig?.color || 'text-gray-400'}`}>
        <Icon className="w-3 h-3" />
        <span className="capitalize">{role}</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-gray-400">Create and manage users</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-6 py-3 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search users..."
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
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
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
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">User</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Role</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Team</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-sports-border/50 hover:bg-white/5"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-green to-emerald-600 flex items-center justify-center">
                          <span className="text-sports-darker font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-gray-500 text-sm">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="py-4 px-4">
                      {user.teamId ? (
                        <span className="text-neon-green text-sm">{user.teamId.name || 'Assigned'}</span>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {user.isActive ? (
                        <span className="flex items-center text-neon-green text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center text-gray-500 text-sm">
                          <XCircle className="w-4 h-4 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        {user.isActive ? (
                          <button
                            onClick={() => handleDeactivate(user._id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                            title="Deactivate"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(user._id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-neon-green hover:bg-neon-green/10 transition-colors"
                            title="Activate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Permanently Delete"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No users found</p>
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
                {editingUser ? 'Edit User' : 'Add New User'}
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
                <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Role</label>
                <div className="grid grid-cols-3 gap-3">
                  {roles.map(role => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role.value })}
                        className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                          formData.role === role.value
                            ? 'border-neon-green bg-neon-green/10'
                            : 'border-sports-border hover:border-gray-600'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${role.color}`} />
                        <span className="text-sm text-white">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Password {editingUser && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                  className="w-full"
                  placeholder={editingUser ? '••••••' : 'Enter password (min 6 characters)'}
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
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
