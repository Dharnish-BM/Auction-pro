import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader } from '../components/common/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { matchService } from '../services/matchService.js';

const TABS = ['setup', 'auction', 'teams', 'scorecard'];

const roleBadge = (role) => {
  const colors = {
    Batsman: 'bg-neon-green/10 text-neon-green border-neon-green/20',
    Bowler: 'bg-neon-blue/10 text-neon-blue border-neon-blue/20',
    'All-Rounder': 'bg-gold/10 text-gold border-gold/20',
    'All-rounder': 'bg-gold/10 text-gold border-gold/20',
    'Wicket-Keeper': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    'Wicket-keeper': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  };
  const cls = colors[role] || 'bg-sports-border text-gray-300 border-sports-border';
  return <span className={`px-2 py-1 text-xs rounded-full border ${cls}`}>{role}</span>;
};

export const MatchDetail = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') || 'setup').toLowerCase();
  const activeTab = TABS.includes(tab) ? tab : 'setup';

  const { isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const match = overview?.match;
  const matchStatus = match?.status;

  const canEditSetup = isAuthenticated && isAdmin() && matchStatus === 'setup';

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await matchService.getOverview(id);
      setOverview(res.data);
    } catch (e) {
      toast.error(e.message || 'Failed to load match overview');
    } finally {
      setLoading(false);
    }
  };

  const loadPool = async () => {
    setPoolLoading(true);
    try {
      const res = await matchService.getPool(id);
      const inPool = res.data.playerPool || [];
      const absent = res.data.absentPlayers || [];
      const merged = [...inPool, ...absent].sort((a, b) => (a.nickname || a.name).localeCompare((b.nickname || b.name)));
      setAllPlayers(merged);
      setSelectedIds(new Set(inPool.map(p => p._id)));
    } catch (e) {
      toast.error(e.message || 'Failed to load player pool');
    } finally {
      setPoolLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeTab === 'setup') {
      loadPool();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  const tabLink = (nextTab) => `/matches/${id}?tab=${nextTab}`;

  const poolCount = selectedIds.size;
  const canStartAuction = canEditSetup && poolCount >= 4;

  const onTogglePlayer = (playerId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const onSavePool = async () => {
    try {
      await matchService.setPool(id, Array.from(selectedIds));
      toast.success('Player pool saved');
      await loadOverview();
      await loadPool();
    } catch (e) {
      toast.error(e.message || 'Failed to save pool');
    }
  };

  const onStartAuction = async () => {
    try {
      // default config for now; can be made configurable later
      await matchService.createAuction(id, {
        budgetPerTeam: 100000,
        basePrice: 0,
        bidIncrement: 1000,
        timerSeconds: 15
      });
      toast.success('Auction created');
      await loadOverview();
      setSearchParams({ tab: 'auction' });
    } catch (e) {
      toast.error(e.message || 'Failed to start auction');
    }
  };

  const oversLabel = useMemo(() => {
    const o = match?.overs;
    if (!o) return '-';
    if ([5, 10, 15, 20].includes(o)) return `${o}`;
    return `${o} (Custom)`;
  }, [match?.overs]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (!overview?.match) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-400">Match not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            Match Hub
          </h1>
          <p className="text-gray-400">
            {match.venue || match.location} • {new Date(match.date).toLocaleDateString()} • {match.time}
          </p>
        </div>
        <Link
          to={`/matches/${id}/live`}
          className="px-4 py-2 rounded-lg bg-sports-border text-white hover:bg-white/10 transition-colors"
        >
          Open Live View
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <Link
            key={t}
            to={tabLink(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === t ? 'bg-neon-green/10 text-neon-green' : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div className="sports-card">
            <h2 className="text-lg font-semibold text-white mb-4">Match Setup</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <p className="text-sm text-gray-400 mb-1">Venue</p>
                <input
                  value={match.venue || ''}
                  disabled
                  className="w-full"
                  placeholder="(Editing venue UI can be added next)"
                />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Overs</p>
                <div className="px-3 py-2 rounded-lg bg-sports-border text-white">{oversLabel}</div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Format</p>
                <div className="px-3 py-2 rounded-lg bg-sports-border text-white">{match.format || 'Custom'}</div>
              </div>
            </div>
          </div>

          <div className="sports-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-white">Player Pool</h2>
              <div className="text-sm text-gray-400">
                Attending: <span className="text-white font-semibold">{poolCount}</span>
              </div>
            </div>

            {poolLoading ? (
              <div className="py-10 flex justify-center">
                <Loader size="medium" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allPlayers.map((p) => {
                  const checked = selectedIds.has(p._id);
                  return (
                    <label
                      key={p._id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        checked ? 'border-neon-green/30 bg-neon-green/5' : 'border-sports-border bg-sports-card'
                      } ${canEditSetup ? 'hover:border-gray-500' : 'opacity-90 cursor-default'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold">
                            {p.nickname || p.name}
                            <span className="text-gray-500 font-normal"> • {p.name}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            {roleBadge(p.role)}
                            {p.battingStyle && <span className="text-xs text-gray-400">{p.battingStyle}</span>}
                            {p.bowlingStyle && <span className="text-xs text-gray-400">{p.bowlingStyle}</span>}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEditSetup}
                          onChange={() => onTogglePlayer(p._id)}
                          className="mt-1"
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {canEditSetup && (
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={onSavePool}
                  className="px-5 py-2 rounded-lg bg-neon-green text-sports-darker font-semibold hover:shadow-neon transition-all"
                >
                  Save Pool
                </button>
              </div>
            )}
          </div>

          <div className="sports-card flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className="text-white font-semibold capitalize">{matchStatus}</p>
            </div>
            {canEditSetup && (
              <button
                onClick={onStartAuction}
                disabled={!canStartAuction}
                className="px-6 py-2 rounded-lg bg-gold text-sports-darker font-semibold disabled:opacity-50"
              >
                Start Auction
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'auction' && (
        <div className="sports-card">
          {matchStatus === 'setup' && <p className="text-gray-400">Auction not started yet.</p>}
          {matchStatus === 'auction_done' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Auction Summary</h2>
              <p className="text-gray-400 text-sm">Summary UI will be improved in Prompt 7.</p>
            </div>
          )}
          {matchStatus === 'auction' && (
            <p className="text-gray-400">
              Auction in progress. AuctionRoom integration lands in Prompt 7.
            </p>
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="sports-card">
          {['auction_done', 'live', 'completed', 'innings_break'].includes(matchStatus) ? (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Teams</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {(overview.teams || []).map((t) => {
                  const spent = (t.totalBudget || 0) - (t.remainingBudget || 0);
                  return (
                    <div key={t._id} className="p-4 rounded-xl bg-sports-border/30 border border-sports-border">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-white font-bold">{t.name}</p>
                          <p className="text-gray-400 text-sm">Captain: {t.captain?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Spent</p>
                          <p className="text-white font-semibold">₹{spent.toLocaleString()} / ₹{(t.totalBudget || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(t.players || []).map((p) => (
                          <div key={p._id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-200">{p.nickname || p.name}</span>
                            <div className="flex items-center gap-2">
                              {roleBadge(p.role)}
                              <span className="text-gold">₹{(p.soldPrice || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {isAdmin() && (
                        <button className="mt-4 px-4 py-2 rounded-lg bg-white/5 text-gray-200 hover:bg-white/10">
                          Adjust Squad
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Teams will be available after the auction is complete.</p>
          )}
        </div>
      )}

      {activeTab === 'scorecard' && (
        <div className="sports-card">
          {['setup', 'auction'].includes(matchStatus) && <p className="text-gray-400">Match not started.</p>}
          {['live', 'innings_break'].includes(matchStatus) && (
            <p className="text-gray-400">LiveScoreboard integration lands in Prompt 8.</p>
          )}
          {matchStatus === 'completed' && (
            <p className="text-gray-400">Static scorecard UI will be improved; backend scorecard endpoint is ready.</p>
          )}
        </div>
      )}
    </div>
  );
};

