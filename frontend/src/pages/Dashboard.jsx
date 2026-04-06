import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader } from '../components/common/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { matchService } from '../services/matchService.js';
import { playerService } from '../services/playerService.js';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ topRuns: [], topWickets: [] });
  const [myCareer, setMyCareer] = useState(null);
  const [recentResultMeta, setRecentResultMeta] = useState(null);
  const [liveScorePreview, setLiveScorePreview] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [live, upcoming, allMatches, lb, allPlayers] = await Promise.all([
          matchService.getLive(),
          matchService.getUpcoming(),
          matchService.getAll(),
          playerService.getLeaderboard(),
          playerService.getAll()
        ]);

        const completed = (allMatches.data || []).filter((m) => m.status === 'completed')
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        setLiveMatches(live.data || []);
        setUpcomingMatches(upcoming.data || []);
        setCompletedMatches(completed);
        setLeaderboard(lb.data || { topRuns: [], topWickets: [] });

        if ((live.data || [])[0]?._id) {
          const liveScore = await matchService.getScorecardPublic((live.data || [])[0]._id);
          setLiveScorePreview(liveScore.data?.innings || []);
        } else {
          setLiveScorePreview(null);
        }

        const linked = (allPlayers.data || []).find((p) => {
          const n = (p.name || '').toLowerCase();
          const nn = (p.nickname || '').toLowerCase();
          const un = (user?.name || '').toLowerCase();
          return un && (un === n || un === nn);
        });

        if (linked?._id) {
          const career = await playerService.getCareer(linked._id);
          setMyCareer(career.data);
        } else {
          setMyCareer(null);
        }

        if (completed[0]?._id) {
          const score = await matchService.getScorecardPublic(completed[0]._id);
          const innings = score.data?.innings || [];
          const batRows = innings.flatMap((i) => i.battingCard || []);
          const bowlRows = innings.flatMap((i) => i.bowlingCard || []);
          const topScorer = [...batRows].sort((a, b) => (b.runs || 0) - (a.runs || 0))[0] || null;
          const bestBowler = [...bowlRows].sort((a, b) => (b.wickets || 0) - (a.wickets || 0) || (a.runs || 0) - (b.runs || 0))[0] || null;
          setRecentResultMeta({ topScorer, bestBowler });
        } else {
          setRecentResultMeta(null);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.name]);

  const liveMatch = liveMatches[0] || null;
  const upcoming = upcomingMatches
    .filter(m => m.status !== 'live')
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;
  const lastCompleted = completedMatches[0] || null;
  const topRuns5 = (leaderboard.topRuns || []).slice(0, 5);
  const topWickets5 = (leaderboard.topWickets || []).slice(0, 5);

  const myCard = useMemo(() => {
    if (!myCareer) return null;
    const c = myCareer.careerStats || {};
    const outs = Math.max(1, (myCareer.matchHistory || []).length - (myCareer.matchHistory || []).filter(m => m.notOut).length);
    const avg = (Number(c.totalRuns || 0) / outs).toFixed(2);
    const sr = Number(c.totalBallsFaced || 0) > 0 ? ((Number(c.totalRuns || 0) * 100) / Number(c.totalBallsFaced || 1)).toFixed(2) : '0.00';
    const last5 = [...(myCareer.matchHistory || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);
    return { c, avg, sr, last5 };
  }, [myCareer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Match, form, and career overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="sports-card lg:col-span-2">
          <h2 className="text-white font-semibold mb-3">Live / Upcoming Match</h2>
          {liveMatch ? (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 text-red-400 font-semibold">🔴 LIVE</span>
                <p className="text-white mt-1">
                  {(liveMatch.teamA?.name || 'Team A')} vs {(liveMatch.teamB?.name || 'Team B')}
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  {(liveScorePreview?.[0]?.totals ? `${liveScorePreview[0].totals.runs}/${liveScorePreview[0].totals.wickets}` : '-')}
                  {'  '}|{'  '}
                  {(liveScorePreview?.[1]?.totals ? `${liveScorePreview[1].totals.runs}/${liveScorePreview[1].totals.wickets}` : '-')}
                </p>
              </div>
              <Link to={`/matches/${liveMatch._id}/live`} className="px-4 py-2 rounded-lg bg-neon-green text-sports-darker font-semibold w-fit">Watch Live</Link>
            </div>
          ) : upcoming ? (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-white">{new Date(upcoming.date).toLocaleDateString()} • {upcoming.venue || upcoming.location}</p>
                <p className="text-sm text-gray-400 capitalize mt-1">{upcoming.status?.replace('_', ' ')}</p>
              </div>
              <Link to={`/matches/${upcoming._id}?tab=setup`} className="px-4 py-2 rounded-lg bg-neon-blue text-sports-darker font-semibold w-fit">View Match</Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-gray-400">No upcoming matches</p>
              {isAdmin() && <Link to="/admin/matches" className="px-4 py-2 rounded-lg bg-gold text-sports-darker font-semibold">Create one</Link>}
            </div>
          )}
        </div>

        <div className="sports-card">
          <h2 className="text-white font-semibold mb-3">Recent Result</h2>
          {lastCompleted ? (
            <div className="space-y-2">
              <p className="text-white">Winner: {lastCompleted.result?.winner?.name || 'TBD'}</p>
              <p className="text-gray-300 text-sm capitalize">
                Margin: {lastCompleted.result?.marginType === 'tie' ? 'Tie' : `${lastCompleted.result?.margin || 0} ${lastCompleted.result?.marginType || ''}`}
              </p>
              <p className="text-gray-300 text-sm">
                Top scorer: {recentResultMeta?.topScorer?.batsmanName || '-'} ({recentResultMeta?.topScorer?.runs || 0})
              </p>
              <p className="text-gray-300 text-sm">
                Best bowler: {recentResultMeta?.bestBowler?.bowlerName || '-'} ({recentResultMeta?.bestBowler?.wickets || 0}/{recentResultMeta?.bestBowler?.runs || 0})
              </p>
              <Link to={`/matches/${lastCompleted._id}/live`} className="inline-flex text-neon-green hover:underline">Full Scorecard</Link>
            </div>
          ) : (
            <p className="text-gray-400">No completed matches yet.</p>
          )}
        </div>

        <div className="sports-card">
          <h2 className="text-white font-semibold mb-3">All-Time Leaderboard</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">Top Runs</p>
              <div className="space-y-1">
                {topRuns5.map((p, i) => (
                  <div key={p._id} className="text-sm flex justify-between text-gray-200">
                    <span>{i + 1}. {p.nickname || p.name}</span>
                    <span>{p.careerStats?.totalRuns || 0} ({p.careerStats?.highScore || 0})</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Top Wickets</p>
              <div className="space-y-1">
                {topWickets5.map((p, i) => (
                  <div key={p._id} className="text-sm flex justify-between text-gray-200">
                    <span>{i + 1}. {p.nickname || p.name}</span>
                    <span>{p.careerStats?.totalWickets || 0} ({p.careerStats?.bestBowlingWickets || 0}/{p.careerStats?.bestBowlingRuns || 0})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Link to="/players" className="inline-flex mt-3 text-neon-green hover:underline">View All</Link>
        </div>

        {myCard && (
          <div className="sports-card">
            <h2 className="text-white font-semibold mb-3">My Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <Stat label="Runs" value={myCard.c.totalRuns || 0} />
              <Stat label="Wickets" value={myCard.c.totalWickets || 0} />
              <Stat label="Matches" value={myCard.c.matchesPlayed || 0} />
              <Stat label="Average" value={myCard.avg} />
              <Stat label="Strike Rate" value={myCard.sr} />
            </div>
            <div className="flex items-center gap-2">
              {myCard.last5.map((m, idx) => {
                const good = (m.runs || 0) >= 20 || (m.wickets || 0) > 0;
                return <span key={idx} title={`${m.runs || 0} runs, ${m.wickets || 0} wkts`} className={`w-3 h-3 rounded-full ${good ? 'bg-neon-green' : 'bg-red-500'}`} />;
              })}
            </div>
            <Link to={`/players/${myCareer._id}`} className="inline-flex mt-3 text-neon-green hover:underline">Open My Profile</Link>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value }) => {
  return (
    <div className="p-3 rounded-lg bg-sports-border/30">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
};
