import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { Loader } from '../components/common/Loader.jsx';
import { playerService } from '../services/playerService.js';

const SORTS = [
  { id: 'runs', label: 'Most Runs' },
  { id: 'wickets', label: 'Most Wickets' },
  { id: 'matches', label: 'Most Matches' },
  { id: 'name', label: 'Name A-Z' },
];

export const Players = () => {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('runs');

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const res = await playerService.getAll();
      setPlayers(res.data || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = [...players];
    if (q) {
      arr = arr.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.nickname || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'runs') arr.sort((a, b) => (b.careerStats?.totalRuns || 0) - (a.careerStats?.totalRuns || 0));
    if (sortBy === 'wickets') arr.sort((a, b) => (b.careerStats?.totalWickets || 0) - (a.careerStats?.totalWickets || 0));
    if (sortBy === 'matches') arr.sort((a, b) => (b.careerStats?.matchesPlayed || 0) - (a.careerStats?.matchesPlayed || 0));
    if (sortBy === 'name') arr.sort((a, b) => (a.nickname || a.name || '').localeCompare(b.nickname || b.name || ''));
    return arr;
  }, [players, search, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Players</h1>
          <p className="text-gray-400">Career stats and profiles</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or nickname..."
            className="w-full pl-9"
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sm:w-56">
          {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader size="large" /></div>
      ) : (
        <div className="sports-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sports-border text-gray-400">
                <th className="text-left py-3">Player</th>
                <th className="text-left">Role</th>
                <th className="text-left">Batting Style</th>
                <th className="text-left">Bowling Style</th>
                <th className="text-center">Base Price</th>
                <th className="text-center">Runs</th>
                <th className="text-center">Wickets</th>
                <th className="text-center">Matches</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id} className="border-b border-sports-border/40 hover:bg-white/5">
                  <td className="py-3">
                    <Link to={`/players/${p._id}`} className="text-white hover:text-neon-green">
                      {p.nickname || p.name}
                      <span className="text-gray-500 ml-2">{p.name !== p.nickname ? `(${p.name})` : ''}</span>
                    </Link>
                  </td>
                  <td className="text-gray-300">{p.role || '-'}</td>
                  <td className="text-gray-300">{p.battingStyle || '-'}</td>
                  <td className="text-gray-300">{p.bowlingStyle || '-'}</td>
                  <td className="text-center text-white">₹{Number(p.basePrice || 5000).toLocaleString()}</td>
                  <td className="text-center text-white">{p.careerStats?.totalRuns || 0}</td>
                  <td className="text-center text-white">{p.careerStats?.totalWickets || 0}</td>
                  <td className="text-center text-white">{p.careerStats?.matchesPlayed || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-600" />
              No players found.
            </div>
          )}
        </div>
      )}

    </div>
  );
};

