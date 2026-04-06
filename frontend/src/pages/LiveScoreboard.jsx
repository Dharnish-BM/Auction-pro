import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Loader } from '../components/common/Loader.jsx';
import { matchService } from '../services/matchService.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';
const oversFromBalls = (balls = 0) => `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;

const chipClass = (s) => {
  if (s === 'W') return 'bg-red-600 text-white';
  if (s === '4') return 'bg-emerald-500 text-sports-darker';
  if (s === '6') return 'bg-gold text-sports-darker';
  if (s === 'Wd' || s === 'Nb') return 'bg-orange-500 text-sports-darker';
  if (s === '0' || s === '•') return 'bg-gray-600 text-white';
  return 'bg-blue-600 text-white';
};

export const LiveScoreboard = () => {
  const { id } = useParams();
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const [livePayload, setLivePayload] = useState(null);
  const [scorecardPayload, setScorecardPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('batting');
  const [socketOk, setSocketOk] = useState(false);

  const fetchAll = useCallback(async () => {
    const [live, score] = await Promise.all([
      matchService.getLivePublic(id),
      matchService.getScorecardPublic(id)
    ]);
    setLivePayload(live.data);
    setScorecardPayload(score.data);
  }, [id]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      fetchAll().catch(() => {});
    }, 5000);
  }, [fetchAll]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await fetchAll();
      } catch (error) {
        console.error('Failed to fetch live data:', error);
      } finally {
        if (mounted) setLoading(false);
      }

      const s = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
      socketRef.current = s;

      s.on('connect', () => {
        setSocketOk(true);
        stopPolling();
        s.emit('join-match', id);
      });
      s.on('disconnect', () => {
        setSocketOk(false);
        startPolling();
      });
      s.on('connect_error', () => {
        setSocketOk(false);
        startPolling();
      });

      s.on('delivery_logged', () => fetchAll().catch(() => {}));
      s.on('delivery_undone', () => fetchAll().catch(() => {}));
      s.on('innings_break', () => fetchAll().catch(() => {}));
      s.on('match_completed', () => fetchAll().catch(() => {}));
      s.on('new_over', () => fetchAll().catch(() => {}));
    };

    init();
    return () => {
      mounted = false;
      stopPolling();
      const s = socketRef.current;
      if (s) {
        try { s.emit('leave-match', id); } catch { /**/ }
        s.disconnect();
      }
    };
  }, [fetchAll, id, startPolling, stopPolling]);

  const innings = scorecardPayload?.innings ?? [];
  const inningsSummary = livePayload?.inningsSummary;
  const activeInnings = !inningsSummary?.inningsNumber
    ? (innings[innings.length - 1] || null)
    : (innings.find(i => i.inningsNumber === inningsSummary.inningsNumber) || null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (!livePayload || !scorecardPayload) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-400">Match not found</p>
      </div>
    );
  }

  const match = livePayload.match;
  const liveState = livePayload.liveState;

  const team1 = innings[0]?.totals;
  const team2 = innings[1]?.totals;
  const target = inningsSummary?.target || (team1 ? team1.runs + 1 : null);
  const remainingBalls = Math.max(0, ((match.overs || 0) * 6) - (inningsSummary?.totalBalls || 0));
  const required = target ? Math.max(0, target - (inningsSummary?.totalRuns || 0)) : 0;

  const bowler = liveState?.currentBowlerStats || {};
  const eco = (() => {
    const o = String(bowler.overs || '0.0');
    const [ov, b] = o.split('.').map(Number);
    const balls = (ov || 0) * 6 + (b || 0);
    return balls > 0 ? ((bowler.runs || 0) / (balls / 6)).toFixed(2) : '0.00';
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/matches" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Matches
      </Link>

      <div className="sports-card mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white font-bold text-xl">
              Team A {team1 ? `${team1.runs}/${team1.wickets} (${oversFromBalls(team1.balls)})` : '-'} vs Team B {team2 ? `${team2.runs}/${team2.wickets} (${oversFromBalls(team2.balls)})` : '-'}
            </p>
            {inningsSummary?.inningsNumber === 2 && target ? (
              <p className="text-gold text-sm mt-1">Target {target} • Need {required} off {remainingBalls} balls</p>
            ) : null}
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className={`w-2 h-2 rounded-full ${match.status === 'live' ? 'bg-neon-green animate-pulse' : 'bg-orange-400'}`} />
              <span className="text-sm font-semibold text-white">{match.status === 'live' ? 'Live' : match.status}</span>
            </div>
            <p className={`text-xs mt-1 ${socketOk ? 'text-neon-green' : 'text-orange-400'}`}>{socketOk ? 'Live' : 'Reconnecting...'}</p>
          </div>
        </div>
      </div>

      {match.status === 'completed' && match.result?.marginType && (
        <div className="sports-card mb-6">
          <p className="text-neon-green font-semibold">
            Match completed • {match.result.marginType === 'tie' ? 'Tie' : `${match.result.margin || 0} ${match.result.marginType}`}
          </p>
        </div>
      )}

      {match.status === 'innings_break' && (
        <div className="sports-card mb-6">
          <p className="text-gold font-semibold">Innings Break</p>
          <p className="text-gray-300 mt-1">
            Innings 1: {innings[0]?.totals?.runs || 0}/{innings[0]?.totals?.wickets || 0} ({oversFromBalls(innings[0]?.totals?.balls || 0)})
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="sports-card">
            <h3 className="text-white font-semibold mb-3">Current Batsmen</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-sports-border">
                    <th className="text-left py-2">Batter</th>
                    <th className="text-center py-2">R</th>
                    <th className="text-center py-2">B</th>
                    <th className="text-center py-2">4s</th>
                    <th className="text-center py-2">6s</th>
                    <th className="text-center py-2">SR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-sports-border/50">
                    <td className="py-2 text-white">{liveState?.strikerName || '-'} <span className="ml-1">🏏</span></td>
                    <td className="text-center text-white">{liveState?.strikerStats?.runs || 0}</td>
                    <td className="text-center text-white">{liveState?.strikerStats?.balls || 0}</td>
                    <td className="text-center text-white">{liveState?.strikerStats?.fours || 0}</td>
                    <td className="text-center text-white">{liveState?.strikerStats?.sixes || 0}</td>
                    <td className="text-center text-white">
                      {(liveState?.strikerStats?.balls || 0) > 0 ? (((liveState.strikerStats.runs || 0) * 100) / liveState.strikerStats.balls).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-200">{liveState?.nonStrikerName || '-'}</td>
                    <td className="text-center text-white">{liveState?.nonStrikerStats?.runs || 0}</td>
                    <td className="text-center text-white">{liveState?.nonStrikerStats?.balls || 0}</td>
                    <td className="text-center text-white">{liveState?.nonStrikerStats?.fours || 0}</td>
                    <td className="text-center text-white">{liveState?.nonStrikerStats?.sixes || 0}</td>
                    <td className="text-center text-white">
                      {(liveState?.nonStrikerStats?.balls || 0) > 0 ? (((liveState.nonStrikerStats.runs || 0) * 100) / liveState.nonStrikerStats.balls).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="sports-card">
            <p className="text-white font-semibold">
              {liveState?.currentBowlerName || '-'}: {bowler.overs || '0.0'}-{bowler.maidens || 0}-{bowler.runs || 0}-{bowler.wickets || 0} (Economy: {eco})
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(liveState?.lastSixBalls || []).map((s, idx) => (
                <span key={`${s}-${idx}`} className={`w-9 h-9 rounded-full inline-flex items-center justify-center text-sm font-bold ${chipClass(s)}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="sports-card">
            <div className="flex items-center gap-2 mb-3">
              {['batting', 'bowling', 'fow'].map(t => (
                <button
                  key={t}
                  className={`px-3 py-2 rounded-lg capitalize ${tab === t ? 'bg-neon-green/15 text-neon-green' : 'bg-sports-border text-gray-300'}`}
                  onClick={() => setTab(t)}
                >
                  {t === 'fow' ? 'Fall of Wickets' : t}
                </button>
              ))}
            </div>

            {tab === 'batting' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-sports-border">
                      <th className="text-left py-2">Batter</th><th className="text-center">R</th><th className="text-center">B</th><th className="text-center">4s</th><th className="text-center">6s</th><th className="text-center">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeInnings?.battingCard || []).map(b => (
                      <tr key={`${b.batsmanId}`} className="border-b border-sports-border/40">
                        <td className="py-2 text-white">{b.batsmanName}</td>
                        <td className="text-center text-white">{b.runs}</td>
                        <td className="text-center text-white">{b.balls}</td>
                        <td className="text-center text-white">{b.fours}</td>
                        <td className="text-center text-white">{b.sixes}</td>
                        <td className="text-center text-white">{b.strikeRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'bowling' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-sports-border">
                      <th className="text-left py-2">Bowler</th><th className="text-center">O</th><th className="text-center">M</th><th className="text-center">R</th><th className="text-center">W</th><th className="text-center">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeInnings?.bowlingCard || []).map(b => (
                      <tr key={`${b.bowlerId}`} className="border-b border-sports-border/40">
                        <td className="py-2 text-white">{b.bowlerName}</td>
                        <td className="text-center text-white">{b.overs}</td>
                        <td className="text-center text-white">{b.maidens}</td>
                        <td className="text-center text-white">{b.runs}</td>
                        <td className="text-center text-white">{b.wickets}</td>
                        <td className="text-center text-white">{b.economy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'fow' && (
              <div className="space-y-2">
                {(activeInnings?.fallOfWickets || []).map(f => (
                  <div key={`${f.wicketNumber}-${f.balls}`} className="p-3 rounded-lg bg-sports-border/30 flex items-center justify-between">
                    <span className="text-gray-200">{f.wicketNumber}. {f.batsmanName}</span>
                    <span className="text-white">{f.runs}/{f.wicketNumber} ({oversFromBalls(f.balls)})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="sports-card">
            <p className="text-white font-semibold">Current Innings</p>
            <p className="text-gray-300 mt-1">{inningsSummary?.totalRuns || 0}/{inningsSummary?.totalWickets || 0} ({oversFromBalls(inningsSummary?.totalBalls || 0)})</p>
          </div>
          <div className="sports-card">
            <p className="text-white font-semibold mb-2">Extras</p>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Wd: {inningsSummary?.extras?.wides || 0}</p>
              <p>Nb: {inningsSummary?.extras?.noBalls || 0}</p>
              <p>Lb: {inningsSummary?.extras?.legByes || 0}</p>
              <p>B: {inningsSummary?.extras?.byes || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
