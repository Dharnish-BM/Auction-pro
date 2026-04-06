import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';
import { Loader } from '../components/common/Loader.jsx';
import { AuctionRoom } from '../components/AuctionRoom.jsx';
import { ScoringPanel } from '../components/ScoringPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { matchService } from '../services/matchService.js';
import { teamService } from '../services/teamService.js';

const TABS = ['setup', 'auction', 'teams', 'scorecard'];

const money = (n) => `₹${Number(n || 0).toLocaleString()}`;

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
  const [directTossWinnerId, setDirectTossWinnerId] = useState('');
  const [directBattingFirstId, setDirectBattingFirstId] = useState('');

  const match = overview?.match;
  const matchStatus = match?.status;
  const hasAuction = Boolean(overview?.auction?._id);
  const flowMode = hasAuction ? 'auction' : 'direct';
  const inningsSummaries = overview?.inningsSummaries || [];
  const result = overview?.result;

  const canEditSetup = isAuthenticated && isAdmin() && matchStatus === 'setup';
  const availableTeams = useMemo(() => {
    const fromOverview = overview?.teams || [];
    if (fromOverview.length >= 2) return fromOverview;
    return [overview?.match?.teamA, overview?.match?.teamB].filter(Boolean);
  }, [overview]);

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

  useEffect(() => {
    if (!availableTeams.length) return;
    if (!directTossWinnerId) setDirectTossWinnerId(String(availableTeams[0]._id));
    if (!directBattingFirstId) setDirectBattingFirstId(String(availableTeams[0]._id));
  }, [availableTeams, directBattingFirstId, directTossWinnerId]);

  const tabLink = (nextTab) => `/matches/${id}?tab=${nextTab}`;

  const poolCount = selectedIds.size;
  const canStartAuction = canEditSetup && poolCount >= 4;
  const totalPlayersAssigned = useMemo(
    () => (overview?.teams || []).reduce((sum, t) => sum + ((t.players || []).length), 0),
    [overview?.teams]
  );
  const teamSummary = useMemo(
    () => (overview?.teams || []).map((t) => ({
      ...t,
      spent: (t.totalBudget || 0) - (t.remainingBudget || 0),
      count: (t.players || []).length
    })),
    [overview?.teams]
  );

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
        basePrice: 5000,
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

  const onStartWithoutAuction = async () => {
    if (!directTossWinnerId || !directBattingFirstId) {
      toast.error('Select toss winner and batting first team');
      return;
    }
    try {
      await matchService.setToss(id, directTossWinnerId, directBattingFirstId);
      toast.success('Match moved to live without auction');
      await loadOverview();
      setSearchParams({ tab: 'scorecard' });
    } catch (e) {
      toast.error(e.message || 'Failed to start match without auction');
    }
  };

  const refreshOverviewInPlace = async () => {
    try {
      const res = await matchService.getOverview(id);
      setOverview(res.data);
    } catch (e) {
      toast.error(e.message || 'Failed to refresh match overview');
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
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                flowMode === 'auction'
                  ? 'bg-gold/10 text-gold border-gold/30'
                  : 'bg-neon-blue/10 text-neon-blue border-neon-blue/30'
              }`}
            >
              {flowMode === 'auction' ? 'Auction Mode' : 'Direct Mode'}
            </span>
          </div>
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
            <div className="flex-1">
              <p className="text-sm text-gray-400">Status</p>
              <p className="text-white font-semibold capitalize">{matchStatus}</p>
              {canEditSetup && (
                <p className="text-xs text-gray-500 mt-1">
                  Choose flow: run auction OR start match directly with current team squads.
                </p>
              )}
            </div>
            {canEditSetup && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={onStartAuction}
                  disabled={!canStartAuction}
                  className="px-5 py-2 rounded-lg bg-gold text-sports-darker font-semibold disabled:opacity-50"
                >
                  Start Auction
                </button>
                <select
                  value={directTossWinnerId}
                  onChange={(e) => setDirectTossWinnerId(e.target.value)}
                  className="min-w-44"
                >
                  {availableTeams.map((t) => (
                    <option key={t._id} value={t._id}>Toss: {t.name}</option>
                  ))}
                </select>
                <select
                  value={directBattingFirstId}
                  onChange={(e) => setDirectBattingFirstId(e.target.value)}
                  className="min-w-44"
                >
                  {availableTeams.map((t) => (
                    <option key={t._id} value={t._id}>Bat first: {t.name}</option>
                  ))}
                </select>
                <button
                  onClick={onStartWithoutAuction}
                  disabled={availableTeams.length < 2 || poolCount < 2}
                  className="px-5 py-2 rounded-lg bg-neon-blue text-sports-darker font-semibold disabled:opacity-50"
                >
                  Start Match (No Auction)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'auction' && (
        <div className="space-y-6">
          {matchStatus === 'setup' && (
            <div className="sports-card">
              <h2 className="text-lg font-semibold text-white mb-2">Auction Not Started</h2>
              <p className="text-gray-400 text-sm">
                You can either start auction from Setup tab, or skip auction and start match directly.
              </p>
            </div>
          )}
          {matchStatus === 'auction_done' && (
            <div className="sports-card">
              <h2 className="text-lg font-semibold text-white mb-3">Auction Summary</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {(teamSummary || []).map((t) => (
                  <div key={t._id} className="p-4 rounded-xl bg-sports-border/30 border border-sports-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-semibold">{t.name}</p>
                      <p className="text-sm text-gray-300">{t.count} players</p>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Spent {money(t.spent)} / {money(t.totalBudget)}</p>
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {(t.players || []).map((p) => (
                        <div key={p._id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-200">{p.nickname || p.name}</span>
                          <span className="text-gold">{money(p.soldPrice || 0)}</span>
                        </div>
                      ))}
                      {(t.players || []).length === 0 && <p className="text-xs text-gray-500">No players bought.</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {matchStatus === 'auction' && (
            <div className="space-y-4">
              {overview.auction?._id ? (
                <AuctionRoom auctionId={overview.auction._id} />
              ) : (
                <p className="text-gray-400">Loading auction…</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="sports-card">
          {['setup', 'auction_done', 'live', 'completed', 'innings_break', 'auction'].includes(matchStatus) ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-white">Teams</h2>
                <span className="px-2 py-1 rounded-full text-xs bg-sports-border text-gray-300">
                  Total Assigned: {totalPlayersAssigned}
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {(overview.teams || []).map((t) => {
                  const spent = (t.totalBudget || 0) - (t.remainingBudget || 0);
                  const pool = overview.playerPool || overview.match?.playerPool || [];
                  const allSquadIds = new Set((overview.teams || []).flatMap(tt => (tt.players || []).map(pp => String(pp._id))));
                  const availableToAdd = pool.filter(p => !allSquadIds.has(String(p._id)));
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
                            <div className="flex items-center gap-2">
                              <span className="text-gray-200">{p.nickname || p.name}</span>
                              {isAdmin() && (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Remove ${p.nickname || p.name} from ${t.name}? This does not affect auction history.`)) return;
                                    try {
                                      await teamService.removePlayer(t._id, p._id);
                                      setOverview(prev => {
                                        if (!prev) return prev;
                                        const nextTeams = (prev.teams || []).map(tt => {
                                          if (String(tt._id) !== String(t._id)) return tt;
                                          return { ...tt, players: (tt.players || []).filter(pp => String(pp._id) !== String(p._id)) };
                                        });
                                        return { ...prev, teams: nextTeams };
                                      });
                                    } catch (e) {
                                      toast.error(e.message || 'Failed to remove player');
                                    }
                                  }}
                                  className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                                  title="Remove from squad"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {roleBadge(p.role)}
                              <span className="text-gold">₹{(p.soldPrice || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {isAdmin() && (
                        <div className="mt-4 flex items-center gap-2">
                          <select
                            className="flex-1"
                            defaultValue=""
                            onChange={async (e) => {
                              const pid = e.target.value;
                              if (!pid) return;
                              try {
                                await teamService.editSquad(t._id, { addPlayerIds: [pid] });
                                await refreshOverviewInPlace();
                              } catch (err) {
                                toast.error(err.message || 'Failed to add player');
                              } finally {
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">Add Player to Squad…</option>
                            {availableToAdd.map(p => (
                              <option key={p._id} value={p._id}>{p.nickname || p.name} ({p.role})</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Teams are not available for this match state yet.</p>
          )}
        </div>
      )}

      {activeTab === 'scorecard' && (
        <div className="sports-card">
          {['setup', 'auction'].includes(matchStatus) && <p className="text-gray-400">Match not started.</p>}
          {['live', 'innings_break'].includes(matchStatus) && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Admin Scoring Panel
              </p>
              {isAdmin() ? (
                <ScoringPanel matchId={id} />
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-300">Live scoring is controlled by the admin from turf.</p>
                  <Link to={`/matches/${id}/live`} className="inline-flex px-4 py-2 rounded-lg bg-neon-green text-sports-darker font-semibold">
                    Open Public Live Scoreboard
                  </Link>
                </div>
              )}
            </div>
          )}
          {matchStatus === 'completed' && (
            <div className="space-y-4">
              {result && (
                <div className="p-4 rounded-xl bg-neon-green/5 border border-neon-green/20">
                  <p className="text-white font-semibold mb-1">Result</p>
                  <p className="text-gray-300 text-sm capitalize">
                    {result.winner?.name
                      ? `${result.winner.name} won by ${result.margin || 0} ${result.marginType || ''}`
                      : result.marginType || 'No result'}
                  </p>
                </div>
              )}
              {inningsSummaries.length > 0 && (
                <div className="grid md:grid-cols-2 gap-3">
                  {inningsSummaries.map((inn) => (
                    <div key={`i-${inn.inningsNumber}`} className="p-3 rounded-lg bg-sports-border/30 border border-sports-border">
                      <p className="text-white font-medium mb-1">Innings {inn.inningsNumber}</p>
                      <p className="text-sm text-gray-300">
                        {inn.totalRuns || 0}/{inn.totalWickets || 0} in {Math.floor((inn.totalBalls || 0) / 6)}.{(inn.totalBalls || 0) % 6} overs
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-gray-300">Match completed. View full public scorecard.</p>
              <Link to={`/matches/${id}/live`} className="inline-flex px-4 py-2 rounded-lg bg-neon-blue text-sports-darker font-semibold">
                Open Final Scoreboard
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

