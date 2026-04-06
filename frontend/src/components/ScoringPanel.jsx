import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { AlertTriangle, Undo2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { matchService } from '../services/matchService.js';
import { Loader } from './common/Loader.jsx';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

const oversFromBalls = (balls = 0) => `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
const numeric = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

const runBtnClass = (k) => {
  if (k === 'W') return 'bg-red-600 text-white';
  if (k === 6) return 'bg-emerald-700 text-white';
  if (k === 4) return 'bg-emerald-500 text-sports-darker';
  if ([1, 2, 3].includes(k)) return 'bg-blue-600 text-white';
  return 'bg-sports-border text-white';
};

const WICKET_TYPES = [
  { id: 'bowled', label: 'Bowled' },
  { id: 'caught', label: 'Caught' },
  { id: 'lbw', label: 'LBW' },
  { id: 'runOut', label: 'Run Out' },
  { id: 'stumped', label: 'Stumped' },
  { id: 'hitWicket', label: 'Hit Wicket' },
  { id: 'retiredOut', label: 'Retired' }
];

export const ScoringPanel = ({ matchId }) => {
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const prevBallsRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [livePayload, setLivePayload] = useState(null);
  const [scorecardPayload, setScorecardPayload] = useState(null);
  const [overview, setOverview] = useState(null);
  const [inFlight, setInFlight] = useState(false);
  const [socketOk, setSocketOk] = useState(false);

  const [extraType, setExtraType] = useState('');
  const [extraRuns, setExtraRuns] = useState(1);

  const [wicketOpen, setWicketOpen] = useState(false);
  const [wicketStep, setWicketStep] = useState(1);
  const [wicketType, setWicketType] = useState('');
  const [fielderId, setFielderId] = useState('');
  const [dismissedId, setDismissedId] = useState('');
  const [nextBatsmanId, setNextBatsmanId] = useState('');

  const [nextBowlerModal, setNextBowlerModal] = useState(false);
  const [inningsBreakModal, setInningsBreakModal] = useState(false);
  const [inning2Openers, setInning2Openers] = useState({ strikerId: '', nonStrikerId: '', openingBowlerId: '' });

  const fetchAll = useCallback(async () => {
    const [live, score, ov] = await Promise.all([
      matchService.getLivePublic(matchId),
      matchService.getScorecardPublic(matchId),
      matchService.getOverview(matchId)
    ]);
    setLivePayload(live.data);
    setScorecardPayload(score.data);
    setOverview(ov.data);
    return { live: live.data, score: score.data, ov: ov.data };
  }, [matchId]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        await fetchAll();
      } catch {
        // ignore
      }
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
      setLoading(true);
      try {
        await fetchAll();
      } catch (e) {
        toast.error(e.message || 'Failed to load scoring panel');
      } finally {
        if (mounted) setLoading(false);
      }

      const s = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
      socketRef.current = s;

      s.on('connect', () => {
        setSocketOk(true);
        stopPolling();
        s.emit('join-match', matchId);
      });
      s.on('disconnect', () => {
        setSocketOk(false);
        startPolling();
      });
      s.on('connect_error', () => {
        setSocketOk(false);
        startPolling();
      });

      s.on('delivery_logged', async () => {
        await fetchAll();
      });
      s.on('delivery_undone', async () => {
        await fetchAll();
      });
      s.on('new_over', async () => {
        setNextBowlerModal(false);
        await fetchAll();
      });
      s.on('innings_break', async () => {
        setInningsBreakModal(true);
        await fetchAll();
      });
      s.on('match_completed', async () => {
        await fetchAll();
      });
    };

    init();
    return () => {
      mounted = false;
      stopPolling();
      const s = socketRef.current;
      if (s) {
        try { s.emit('leave-match', matchId); } catch { /**/ }
        s.disconnect();
      }
      socketRef.current = null;
    };
  }, [fetchAll, matchId, startPolling, stopPolling]);

  const match = livePayload?.match;
  const liveState = livePayload?.liveState;
  const inningsSummary = livePayload?.inningsSummary;
  const innings = useMemo(() => scorecardPayload?.innings || [], [scorecardPayload?.innings]);
  const activeInnings = useMemo(() => {
    if (!inningsSummary?.inningsNumber) return null;
    return innings.find(i => i.inningsNumber === inningsSummary.inningsNumber) || null;
  }, [innings, inningsSummary?.inningsNumber]);
  const innings1 = innings.find(i => i.inningsNumber === 1) || null;

  const teams = useMemo(() => overview?.teams || [], [overview?.teams]);
  const battingTeam = teams.find(t => String(t._id) === String(activeInnings?.battingTeam));
  const bowlingTeam = teams.find(t => String(t._id) === String(activeInnings?.bowlingTeam));

  const strikerLine = `${liveState?.strikerName || '-'} ${liveState?.strikerStats?.runs || 0}*(${liveState?.strikerStats?.balls || 0})`;
  const nonStrikerLine = `${liveState?.nonStrikerName || '-'} ${liveState?.nonStrikerStats?.runs || 0}(${liveState?.nonStrikerStats?.balls || 0})`;
  const bowlerLine = `${liveState?.currentBowlerName || '-'} — ${liveState?.currentBowlerStats?.overs || '0.0'}-${liveState?.currentBowlerStats?.maidens || 0}-${liveState?.currentBowlerStats?.runs || 0}-${liveState?.currentBowlerStats?.wickets || 0}`;

  const target = inningsSummary?.target || (innings1 ? innings1.totals.runs + 1 : null);
  const remainingBalls = Math.max(0, (numeric(match?.overs) * 6) - numeric(inningsSummary?.totalBalls));
  const required = target ? Math.max(0, target - numeric(inningsSummary?.totalRuns)) : 0;
  const rrr = remainingBalls > 0 ? ((required * 6) / remainingBalls).toFixed(2) : '0.00';

  const canScore = match?.status === 'live' && !inFlight;

  const refreshAfterMutation = async (responseData) => {
    if (responseData?.liveState && responseData?.inningsSummary) {
      setLivePayload(prev => prev ? ({ ...prev, liveState: responseData.liveState, inningsSummary: responseData.inningsSummary }) : prev);
    }
    await fetchAll();
  };

  const postDelivery = async (payload) => {
    setInFlight(true);
    try {
      const res = await matchService.logDelivery(matchId, payload);
      await refreshAfterMutation(res.data);
      const nowBalls = res.data?.inningsSummary?.totalBalls || 0;
      const prevBalls = prevBallsRef.current;
      prevBallsRef.current = nowBalls;
      if (nowBalls > prevBalls && nowBalls % 6 === 0 && match?.status === 'live') {
        setNextBowlerModal(true);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to log delivery');
    } finally {
      setInFlight(false);
    }
  };

  const handleRun = async (value) => {
    if (!canScore) return;
    if (value === 'W') {
      setWicketOpen(true);
      setWicketStep(1);
      setWicketType('');
      setFielderId('');
      setDismissedId('');
      setNextBatsmanId('');
      return;
    }
    await postDelivery({
      runs: value,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
      isBoundary: value === 4,
      isSix: value === 6
    });
  };

  const handleExtraConfirm = async () => {
    if (!extraType || !canScore) return;
    await postDelivery({
      runs: 0,
      extraType,
      extraRuns,
      isWicket: false,
      isBoundary: false,
      isSix: false
    });
    setExtraType('');
    setExtraRuns(1);
  };

  const handleUndo = async () => {
    if (!window.confirm('Undo last delivery?')) return;
    setInFlight(true);
    try {
      await matchService.undoLastDelivery(matchId);
      await fetchAll();
    } catch (e) {
      toast.error(e.message || 'Undo failed');
    } finally {
      setInFlight(false);
    }
  };

  const availableNextBatters = useMemo(() => {
    const battingIds = new Set((battingTeam?.players || []).map(p => String(p._id)));
    const dismissed = new Set((activeInnings?.fallOfWickets || []).map(f => String(f.batsmanId)));
    if (dismissedId) dismissed.add(String(dismissedId));
    const currently = new Set([String(liveState?.strikerId || ''), String(liveState?.nonStrikerId || '')]);
    return (battingTeam?.players || []).filter(p => {
      const id = String(p._id);
      return battingIds.has(id) && !dismissed.has(id) && !currently.has(id);
    });
  }, [activeInnings?.fallOfWickets, battingTeam?.players, dismissedId, liveState?.nonStrikerId, liveState?.strikerId]);

  const handleWicketConfirm = async () => {
    if (!wicketType || !nextBatsmanId) return;
    if (['caught', 'stumped', 'runOut'].includes(wicketType) && !fielderId) return;
    const outId = wicketType === 'runOut' ? dismissedId : (dismissedId || liveState?.strikerId);
    if (!outId) return;
    setWicketOpen(false);
    await postDelivery({
      runs: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: true,
      wicketType,
      dismissedBatsmanId: outId,
      fielderId: fielderId || undefined,
      nextBatsmanId
    });
  };

  const handleSetNextBowler = async (bowlerId) => {
    setInFlight(true);
    try {
      await matchService.setNextBowler(matchId, bowlerId);
      setNextBowlerModal(false);
      await fetchAll();
    } catch (e) {
      toast.error(e.message || 'Failed to set next bowler');
    } finally {
      setInFlight(false);
    }
  };

  const handleStartInnings2 = async () => {
    if (!innings1 || !inning2Openers.strikerId || !inning2Openers.nonStrikerId || !inning2Openers.openingBowlerId) return;
    const nextBattingTeamId = String(innings1.bowlingTeam);
    const nextBowlingTeamId = String(innings1.battingTeam);
    setInFlight(true);
    try {
      await matchService.startInnings(matchId, {
        battingTeamId: nextBattingTeamId,
        bowlingTeamId: nextBowlingTeamId,
        strikerId: inning2Openers.strikerId,
        nonStrikerId: inning2Openers.nonStrikerId,
        openingBowlerId: inning2Openers.openingBowlerId
      });
      setInningsBreakModal(false);
      await fetchAll();
    } catch (e) {
      toast.error(e.message || 'Failed to start innings 2');
    } finally {
      setInFlight(false);
    }
  };

  useEffect(() => {
    if (match?.status === 'innings_break') setInningsBreakModal(true);
  }, [match?.status]);

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader size="medium" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="sports-card sticky top-2 z-10">
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-white font-semibold">
            {inningsSummary?.totalRuns || 0}/{inningsSummary?.totalWickets || 0} ({oversFromBalls(inningsSummary?.totalBalls || 0)})
          </p>
          <span className={`text-xs ${socketOk ? 'text-neon-green' : 'text-orange-400'}`}>{socketOk ? 'Live' : 'Reconnecting...'}</span>
        </div>
        <p className="text-white font-bold mt-2">{strikerLine}</p>
        <p className="text-gray-300">{nonStrikerLine}</p>
        <p className="text-gray-400 mt-1">{bowlerLine}</p>
        {inningsSummary?.inningsNumber === 2 && target ? (
          <p className="mt-2 text-gold text-sm">Need {required} off {remainingBalls} balls • RRR: {rrr}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 6, 'W'].map(v => (
          <button
            key={String(v)}
            className={`min-h-[52px] rounded-xl font-bold ${runBtnClass(v)} disabled:opacity-50`}
            onClick={() => handleRun(v)}
            disabled={!canScore}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="sports-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'wide', label: 'Wide', defaultRuns: 1 },
            { id: 'noBall', label: 'No Ball', defaultRuns: 1 },
            { id: 'legBye', label: 'Leg Bye', defaultRuns: 1 },
            { id: 'bye', label: 'Bye', defaultRuns: 1 }
          ].map(x => (
            <button
              key={x.id}
              className="min-h-[52px] rounded-xl bg-sports-border text-white disabled:opacity-50"
              disabled={!canScore}
              onClick={() => {
                setExtraType(x.id);
                setExtraRuns(x.defaultRuns);
              }}
            >
              {x.label}
            </button>
          ))}
        </div>

        {extraType && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[1, 2, 4].map(n => (
              <button key={n} className="min-h-[52px] px-4 rounded-xl bg-white/5 text-white" onClick={() => setExtraRuns(n)}>
                +{n}
              </button>
            ))}
            <button className="min-h-[52px] px-4 rounded-xl bg-neon-blue text-sports-darker font-semibold" onClick={handleExtraConfirm} disabled={!canScore}>
              Confirm {extraType} ({extraRuns})
            </button>
            <button className="min-h-[52px] px-4 rounded-xl bg-white/5 text-gray-300" onClick={() => setExtraType('')}>
              Cancel
            </button>
          </div>
        )}

        <button
          className="mt-4 w-full min-h-[52px] rounded-xl bg-red-600/20 text-red-300 flex items-center justify-center gap-2"
          onClick={handleUndo}
          disabled={inFlight}
        >
          <Undo2 className="w-4 h-4" /> Undo Last Delivery
        </button>
      </div>

      {wicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-2xl bg-sports-dark border border-sports-border rounded-2xl p-4 space-y-4">
            <p className="text-white font-semibold">Wicket Flow</p>

            {wicketStep === 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WICKET_TYPES.map(w => (
                  <button key={w.id} className="min-h-[52px] rounded-xl bg-sports-border text-white" onClick={() => { setWicketType(w.id); setWicketStep(2); }}>
                    {w.label}
                  </button>
                ))}
              </div>
            )}

            {wicketStep === 2 && ['caught', 'stumped', 'runOut'].includes(wicketType) && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Select fielder</p>
                <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {(bowlingTeam?.players || []).map(p => (
                    <button key={p._id} className={`min-h-[52px] rounded-xl ${fielderId === p._id ? 'bg-neon-green text-sports-darker' : 'bg-sports-border text-white'}`} onClick={() => setFielderId(p._id)}>
                      {p.nickname || p.name}
                    </button>
                  ))}
                </div>
                <button className="mt-3 min-h-[52px] px-4 rounded-xl bg-neon-blue text-sports-darker" onClick={() => setWicketStep(wicketType === 'runOut' ? 3 : 4)}>
                  Next
                </button>
              </div>
            )}

            {wicketStep === 2 && !['caught', 'stumped', 'runOut'].includes(wicketType) && (
              <button className="min-h-[52px] px-4 rounded-xl bg-neon-blue text-sports-darker" onClick={() => setWicketStep(4)}>
                Next
              </button>
            )}

            {wicketStep === 3 && wicketType === 'runOut' && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Who is out?</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <button className={`min-h-[52px] rounded-xl ${dismissedId === liveState?.strikerId ? 'bg-red-500 text-white' : 'bg-sports-border text-white'}`} onClick={() => setDismissedId(String(liveState?.strikerId))}>
                    {liveState?.strikerName}
                  </button>
                  <button className={`min-h-[52px] rounded-xl ${dismissedId === liveState?.nonStrikerId ? 'bg-red-500 text-white' : 'bg-sports-border text-white'}`} onClick={() => setDismissedId(String(liveState?.nonStrikerId))}>
                    {liveState?.nonStrikerName}
                  </button>
                </div>
                <button className="mt-3 min-h-[52px] px-4 rounded-xl bg-neon-blue text-sports-darker" onClick={() => setWicketStep(4)} disabled={!dismissedId}>
                  Next
                </button>
              </div>
            )}

            {wicketStep === 4 && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Select next batter</p>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {availableNextBatters.map(p => (
                    <button key={p._id} className={`w-full min-h-[52px] rounded-xl ${nextBatsmanId === p._id ? 'bg-neon-green text-sports-darker' : 'bg-sports-border text-white'}`} onClick={() => setNextBatsmanId(p._id)}>
                      {p.nickname || p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button className="min-h-[52px] px-4 rounded-xl bg-white/5 text-gray-300" onClick={() => setWicketOpen(false)}>Cancel</button>
              <button className="min-h-[52px] px-4 rounded-xl bg-red-600 text-white" disabled={!nextBatsmanId || !wicketType} onClick={handleWicketConfirm}>
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}

      {nextBowlerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-xl bg-sports-dark border border-sports-border rounded-2xl p-4">
            <p className="text-white font-semibold mb-3">Over complete! Select next bowler:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(bowlingTeam?.players || []).map(p => {
                const blocked = String(p._id) === String(liveState?.currentBowlerId);
                return (
                  <button
                    key={p._id}
                    className={`w-full min-h-[52px] rounded-xl ${blocked ? 'bg-gray-700 text-gray-400' : 'bg-sports-border text-white'}`}
                    disabled={blocked || inFlight}
                    onClick={() => handleSetNextBowler(p._id)}
                  >
                    {p.nickname || p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {inningsBreakModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
          <div className="w-full max-w-2xl bg-sports-dark border border-sports-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-gold">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-semibold">Innings Break</p>
            </div>
            <div className="sports-card">
              <p className="text-white font-semibold">Innings 1 Summary</p>
              <p className="text-gray-300 mt-1">
                {innings1?.totals?.runs || 0}/{innings1?.totals?.wickets || 0} ({oversFromBalls(innings1?.totals?.balls || 0)})
              </p>
            </div>

            <p className="text-sm text-gray-400">Select openers for innings 2 and opening bowler</p>
            <div className="grid md:grid-cols-3 gap-3">
              <select value={inning2Openers.strikerId} onChange={(e) => setInning2Openers(v => ({ ...v, strikerId: e.target.value }))}>
                <option value="">Striker</option>
                {(teams.find(t => String(t._id) === String(innings1?.bowlingTeam))?.players || []).map(p => (
                  <option key={p._id} value={p._id}>{p.nickname || p.name}</option>
                ))}
              </select>
              <select value={inning2Openers.nonStrikerId} onChange={(e) => setInning2Openers(v => ({ ...v, nonStrikerId: e.target.value }))}>
                <option value="">Non-striker</option>
                {(teams.find(t => String(t._id) === String(innings1?.bowlingTeam))?.players || []).map(p => (
                  <option key={p._id} value={p._id}>{p.nickname || p.name}</option>
                ))}
              </select>
              <select value={inning2Openers.openingBowlerId} onChange={(e) => setInning2Openers(v => ({ ...v, openingBowlerId: e.target.value }))}>
                <option value="">Opening Bowler</option>
                {(teams.find(t => String(t._id) === String(innings1?.battingTeam))?.players || []).map(p => (
                  <option key={p._id} value={p._id}>{p.nickname || p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="min-h-[52px] px-4 rounded-xl bg-white/5 text-gray-300" onClick={() => setInningsBreakModal(false)}>Close</button>
              <button className="min-h-[52px] px-4 rounded-xl bg-neon-green text-sports-darker font-semibold" onClick={handleStartInnings2} disabled={inFlight}>
                Start Innings 2
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

