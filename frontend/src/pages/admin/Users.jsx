import { ChevronDown, ChevronUp, Shield, User, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader } from '../../components/common/Loader.jsx';
import { userService } from '../../services/userService.js';

const CRICKET_ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];
const BATTING_STYLES = ['Right-hand bat', 'Left-hand bat'];
const BOWLING_STYLES = [
  'Right-arm fast',
  'Right-arm medium',
  'Left-arm fast',
  'Left-arm medium',
  'Right-arm off-spin',
  'Left-arm spin',
  'Right-arm leg-spin'
];

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [form, setForm] = useState({
    name: '',
    nickname: '',
    email: '',
    password: '',
    role: 'All-rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getAll();
      setUsers(res.data || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.playerId?.nickname || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  const addPlayer = async (e) => {
    e.preventDefault();
    try {
      const res = await userService.create(form);
      const created = res.data?.user;
      if (created) {
        setUsers((prev) => [created, ...prev]);
      }
      setForm({
        name: '',
        nickname: '',
        email: '',
        password: '',
        role: 'All-rounder',
        battingStyle: 'Right-hand bat',
        bowlingStyle: 'Right-arm medium'
      });
      toast.success('Player added');
      await loadUsers();
    } catch (e2) {
      toast.error(e2.message || 'Failed to add player');
    }
  };

  const appRoleBadge = (r) => {
    const role = (r || '').toLowerCase();
    if (role === 'admin') return <span className="px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-300">Admin</span>;
    if (role === 'captain') return <span className="px-2 py-1 rounded-full text-xs bg-neon-blue/10 text-neon-blue">Captain</span>;
    return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/10 text-gray-300">Viewer</span>;
  };

  const toggleRole = async (u) => {
    const role = (u.appRole || u.role || '').toLowerCase();
    const next = role === 'captain' ? 'Viewer' : 'Captain';
    try {
      await userService.setAppRole(u._id, next);
      toast.success(`Set to ${next}`);
      await loadUsers();
    } catch (e) {
      toast.error(e.message || 'Failed to change role');
    }
  };

  const toggleActive = async (u) => {
    try {
      if (u.isActive) await userService.deactivate(u._id);
      else await userService.activate(u._id);
      toast.success(u.isActive ? 'User deactivated' : 'User activated');
      await loadUsers();
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const submitResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await userService.resetPassword(userId, newPassword);
      toast.success('Password updated');
      setResetFor(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      toast.error(e.message || 'Failed to reset password');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Users</h1>
        <p className="text-gray-400">Every user is also a player profile.</p>
      </div>

      <div className="sports-card mb-6">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowAdd((v) => !v)}
        >
          <span className="text-white font-semibold">Add Player</span>
          {showAdd ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showAdd && (
          <form onSubmit={addPlayer} className="mt-4 grid md:grid-cols-2 gap-4">
            <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input type="text" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {CRICKET_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={form.battingStyle} onChange={(e) => setForm({ ...form, battingStyle: e.target.value })}>
              {BATTING_STYLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="md:col-span-2" value={form.bowlingStyle} onChange={(e) => setForm({ ...form, bowlingStyle: e.target.value })}>
              {BOWLING_STYLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="px-6 py-2 rounded-lg bg-neon-green text-sports-darker font-semibold">Add Player</button>
            </div>
          </form>
        )}
      </div>

      <div className="mb-4">
        <input
          placeholder="Search by name / nickname / email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader size="large" /></div>
      ) : (
        <div className="sports-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sports-border text-gray-400">
                <th className="text-left py-3">Name</th>
                <th className="text-left">Nickname</th>
                <th className="text-left">Email</th>
                <th className="text-left">Cricket Role</th>
                <th className="text-left">App Role</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const role = (u.appRole || u.role || '').toLowerCase();
                const isAdmin = role === 'admin';
                return (
                  <tr key={u._id} className="border-b border-sports-border/40">
                    <td className="py-3 text-white">{u.name}</td>
                    <td className="text-gray-200">{u.playerId?.nickname || '-'}</td>
                    <td className="text-gray-300">{u.email}</td>
                    <td className="text-gray-200">{u.playerId?.role || '-'}</td>
                    <td>{appRoleBadge(role)}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {!isAdmin && (
                          <button
                            onClick={() => toggleRole(u)}
                            className="px-3 py-1 rounded-lg bg-white/5 text-gray-200 hover:bg-white/10"
                          >
                            {role === 'captain' ? 'Make Viewer' : 'Make Captain'}
                          </button>
                        )}

                        {!isAdmin && (
                          <button
                            onClick={() => setResetFor(resetFor === u._id ? null : u._id)}
                            className="px-3 py-1 rounded-lg bg-white/5 text-gray-200 hover:bg-white/10"
                          >
                            Reset Password
                          </button>
                        )}

                        {!isAdmin && (
                          <button
                            onClick={() => toggleActive(u)}
                            className={`px-3 py-1 rounded-lg ${u.isActive ? 'bg-yellow-500/10 text-yellow-300' : 'bg-neon-green/10 text-neon-green'}`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}

                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 text-red-300 text-xs">
                            <Shield className="w-3 h-3" /> Protected Admin
                          </span>
                        )}
                      </div>

                      {resetFor === u._id && !isAdmin && (
                        <div className="mt-2 p-3 rounded-lg bg-sports-border/30 flex flex-col md:flex-row gap-2">
                          <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <input
                            type="password"
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          <button onClick={() => submitResetPassword(u._id)} className="px-3 py-2 rounded-lg bg-neon-green text-sports-darker font-semibold">
                            Update
                          </button>
                          <button onClick={() => setResetFor(null)} className="px-3 py-2 rounded-lg bg-white/5 text-gray-200">
                            <XCircle className="w-4 h-4 inline-block mr-1" /> Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
