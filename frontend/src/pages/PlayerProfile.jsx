import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader } from '../components/common/Loader.jsx';
import { playerService } from '../services/playerService.js';

const stat = (v) => Number(v || 0);

const roleBadge = (role) => {
  const map = {
    Batsman: 'bg-neon-green/10 text-neon-green border-neon-green/20',
    Bowler: 'bg-neon-blue/10 text-neon-blue border-neon-blue/20',
    'All-rounder': 'bg-gold/10 text-gold border-gold/20',
    'All-Rounder': 'bg-gold/10 text-gold border-gold/20',
    'Wicket-keeper': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    'Wicket-Keeper': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  };
  return map[role] || 'bg-sports-border text-gray-300 border-sports-border';
};

export const PlayerProfile = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const career = await playerService.getCareer(id);
        setPlayer(career.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const batting = useMemo(() => {
    if (!player) return null;
    const c = player.careerStats || {};
    const outs = Math.max(1, stat(c.matchesPlayed) - (player.matchHistory || []).filter(m => m.notOut).length);
    const avg = outs > 0 ? (stat(c.totalRuns) / outs).toFixed(2) : '0.00';
    const sr = stat(c.totalBallsFaced) > 0 ? ((stat(c.totalRuns) * 100) / stat(c.totalBallsFaced)).toFixed(2) : '0.00';
    return { avg, sr };
  }, [player]);

  const bowling = useMemo(() => {
    if (!player) return null;
    const c = player.careerStats || {};
    const avg = stat(c.totalWickets) > 0 ? (stat(c.totalRunsConceded) / stat(c.totalWickets)).toFixed(2) : '0.00';
    const eco = stat(c.totalBallsBowled) > 0 ? ((stat(c.totalRunsConceded) * 6) / stat(c.totalBallsBowled)).toFixed(2) : '0.00';
    const sr = stat(c.totalWickets) > 0 ? (stat(c.totalBallsBowled) / stat(c.totalWickets)).toFixed(2) : '0.00';
    const best = `${stat(c.bestBowlingWickets)}/${stat(c.bestBowlingRuns)}`;
    return { avg, eco, sr, best };
  }, [player]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader size="large" /></div>;
  }

  if (!player) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-gray-400">Player not found.</div>;
  }

  const c = player.careerStats || {};
  const sortedHistory = [...(player.matchHistory || [])].sort((a, b) => {
    const ad = new Date(a.matchId?.date || a.date || 0).getTime();
    const bd = new Date(b.matchId?.date || b.date || 0).getTime();
    return bd - ad;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/players" className="text-sm text-gray-400 hover:text-white">← Back to players</Link>

      <div className="sports-card flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-sports-border flex items-center justify-center text-2xl font-bold text-white">
          {(player.nickname || player.name || 'P').charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{player.name}</h1>
          <p className="text-gray-400">{player.nickname}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full border ${roleBadge(player.role)}`}>{player.role}</span>
            {player.battingStyle && <span className="text-xs text-gray-400">{player.battingStyle}</span>}
            {player.bowlingStyle && <span className="text-xs text-gray-400">{player.bowlingStyle}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Matches', c.matchesPlayed],
          ['Runs', c.totalRuns],
          ['Wickets', c.totalWickets],
          ['Catches', c.catches]
        ].map(([label, value]) => (
          <div key={label} className="sports-card">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value || 0}</p>
          </div>
        ))}
      </div>

      <div className="sports-card overflow-x-auto">
        <h2 className="text-white font-semibold mb-3">Batting Stats</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-sports-border text-gray-400"><th className="text-left py-2">Mat</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>50s</th><th>100s</th><th>4s</th><th>6s</th></tr></thead>
          <tbody><tr className="text-white"><td className="py-2">{c.matchesPlayed || 0}</td><td className="text-center">{c.totalRuns || 0}</td><td className="text-center">{c.highScore || 0}</td><td className="text-center">{batting?.avg || '0.00'}</td><td className="text-center">{batting?.sr || '0.00'}</td><td className="text-center">{c.fifties || 0}</td><td className="text-center">{c.hundreds || 0}</td><td className="text-center">{c.fours || 0}</td><td className="text-center">{c.sixes || 0}</td></tr></tbody>
        </table>
      </div>

      <div className="sports-card overflow-x-auto">
        <h2 className="text-white font-semibold mb-3">Bowling Stats</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-sports-border text-gray-400"><th className="text-left py-2">Mat</th><th>Wkts</th><th>Best</th><th>Avg</th><th>Economy</th><th>SR</th></tr></thead>
          <tbody><tr className="text-white"><td className="py-2">{c.matchesPlayed || 0}</td><td className="text-center">{c.totalWickets || 0}</td><td className="text-center">{bowling?.best || '0/0'}</td><td className="text-center">{bowling?.avg || '0.00'}</td><td className="text-center">{bowling?.eco || '0.00'}</td><td className="text-center">{bowling?.sr || '0.00'}</td></tr></tbody>
        </table>
      </div>

      <div className="sports-card overflow-x-auto">
        <h2 className="text-white font-semibold mb-3">Match History</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-sports-border text-gray-400"><th className="text-left py-2">Date</th><th>Venue</th><th>Runs (B)</th><th>Wickets</th><th>Catches</th></tr></thead>
          <tbody>
            {sortedHistory.map((m, idx) => (
              <tr key={`${m.matchId?._id || idx}`} className="border-b border-sports-border/40 text-white">
                <td className="py-2">{new Date(m.matchId?.date || m.date || Date.now()).toLocaleDateString()}</td>
                <td>{m.matchId?.venue || m.matchId?.location || '-'}</td>
                <td className="text-center">{m.runs || 0} ({m.ballsFaced || 0})</td>
                <td className="text-center">{m.wickets || 0}</td>
                <td className="text-center">{m.catches || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sports-card overflow-x-auto">
        <h2 className="text-white font-semibold mb-3">Auction History</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-sports-border text-gray-400"><th className="text-left py-2">Match</th><th>Team</th><th>Sold For</th></tr></thead>
          <tbody>
            {(player.auctionHistory || []).map((a, idx) => (
              <tr key={`${a.matchId || idx}`} className="border-b border-sports-border/40 text-white">
                <td className="py-2">{a.matchId?.venue || a.matchId?.location || new Date(a.matchId?.date || Date.now()).toLocaleDateString()}</td>
                <td>{a.teamId?.name || 'Unsold'}</td>
                <td>{a.unsold ? '-' : `₹${Number(a.soldFor || 0).toLocaleString()}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

