import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ChevronDown, ChevronUp, Pause, Play, SkipForward, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext.jsx';
import { auctionService } from '../services/auctionService.js';
import { Loader } from './common/Loader.jsx';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

const formatMoney = (n) => `₹${Number(n || 0).toLocaleString()}`;

const roleBadgeClass = (role) => {
  const map = {
    Batsman: 'bg-neon-green/10 text-neon-green border-neon-green/20',
    Bowler: 'bg-neon-blue/10 text-neon-blue border-neon-blue/20',
    'All-rounder': 'bg-gold/10 text-gold border-gold/20',
    'All-Rounder': 'bg-gold/10 text-gold border-gold/20',
    'Wicket-keeper': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    'Wicket-Keeper': 'bg-purple-400/10 text-purple-400 border-purple-400/20'
  };
  return map[role] || 'bg-sports-border text-gray-300 border-sports-border';
};

const TimerRing = ({ remainingSeconds, totalSeconds }) => {
  const radius = 36;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = circumference - ratio * circumference;
  const danger = remainingSeconds <= 5;

  return (
    <div className="relative w-20 h-20">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="rgba(255,255,255,0.12)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={danger ? '#ff445d' : '#00ff88'}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.3s linear' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-mono text-lg font-bold ${danger ? 'text-red-400' : 'text-white'}`}>
          {Math.max(0, remainingSeconds)}
        </span>
      </div>
    </div>
  );
};

export const AuctionRoom = ({ auctionId }) => {
  const { user, isAdmin, isCaptain } = useAuth();
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null);
  const [socketOk, setSocketOk] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [banner, setBanner] = useState(null); // { type, text }
  const [showUnsold, setShowUnsold] = useState(false);

  const [bidAmount, setBidAmount] = useState('');
  const [overrideTeamId, setOverrideTeamId] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');

  const config = state?.config;
  const currentPlayer = state?.currentPlayer;
  const teams = state?.teams || [];

  const myTeam = useMemo(() => {
    if (!user?._id) return null;
    return teams.find(t => String(t.captain?._id) === String(user._id)) || null;
  }, [teams, user?._id]);

  const currentBid = state?.highestBid || 0;
  const currentBidTeamName = state?.highestBidderName || '';

  const effectiveBasePrice = config?.basePrice ?? 0;
  const bidIncrement = config?.bidIncrement ?? 1000;
  const timerSeconds = config?.timerSeconds ?? 15;

  const canPlaceBid = isCaptain() && state?.status === 'active' && remainingSeconds > 0 && myTeam && (!state?.highestBidder || String(state.highestBidder) !== String(myTeam._id));

  const budgetColor = (team) => {
    const total = team.totalBudget || config?.budgetPerTeam || 0;
    const remaining = team.remainingBudget ?? 0;
    if (!total) return 'text-white';
    const ratio = remaining / total;
    if (ratio > 0.5) return 'text-neon-green';
    if (ratio >= 0.25) return 'text-orange-400';
    return 'text-red-400';
  };

  const fetchState = async () => {
    const res = await auctionService.getState(auctionId);
    const nextState = res.data;
    setState(nextState);
    if (typeof nextState?.config?.timerSeconds === 'number' && nextState?.status !== 'paused') {
      // don't override paused visual; timer ticks will handle it
      setRemainingSeconds((prev) => (prev > 0 ? prev : nextState.config.timerSeconds));
    }
    return nextState;
  };

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        await fetchState();
      } catch (_e) {
        // ignore
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // initial load + connect socket
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        await fetchState();
      } catch (e) {
        toast.error(e.message || 'Failed to load auction state');
      } finally {
        if (mounted) setLoading(false);
      }

      // connect socket
      const socket = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketOk(true);
        stopPolling();
        socket.emit('join-auction', { auctionId });
      });

      socket.on('disconnect', () => {
        setSocketOk(false);
        startPolling();
      });

      socket.on('connect_error', () => {
        setSocketOk(false);
        startPolling();
      });

      socket.on('timer_tick', (data) => {
        if (data?.auctionId !== auctionId) return;
        setRemainingSeconds(data.remainingSeconds ?? 0);
      });

      socket.on('auction_started', (data) => {
        if (data?.auctionId !== auctionId) return;
        setRemainingSeconds(data.timerSeconds ?? timerSeconds);
        setBanner(null);
        fetchState().catch(() => {});
      });

      socket.on('auction_resumed', (data) => {
        if (data?.auctionId !== auctionId) return;
        setRemainingSeconds(data.timerSeconds ?? timerSeconds);
        setBanner(null);
        fetchState().catch(() => {});
      });

      socket.on('auction_paused', (data) => {
        if (data?.auctionId !== auctionId) return;
        setBanner({ type: 'paused', text: 'PAUSED' });
        fetchState().catch(() => {});
      });

      socket.on('new_bid', (data) => {
        if (data?.auctionId !== auctionId) return;
        setRemainingSeconds(data.timerSeconds ?? timerSeconds);
        fetchState().catch(() => {});
      });

      socket.on('admin_override', (data) => {
        if (data?.auctionId !== auctionId) return;
        fetchState().catch(() => {});
      });

      socket.on('player_sold', (data) => {
        if (data?.auctionId !== auctionId) return;
        setBanner({ type: 'sold', text: `SOLD! ${formatMoney(data.amount)} to ${data.team?.name || ''}` });
        setTimeout(() => setBanner(null), 2000);
        fetchState().catch(() => {});
      });

      socket.on('player_unsold', (data) => {
        if (data?.auctionId !== auctionId) return;
        setBanner({ type: 'unsold', text: 'UNSOLD' });
        setTimeout(() => setBanner(null), 1500);
        fetchState().catch(() => {});
      });

      socket.on('player_skipped', (data) => {
        if (data?.auctionId !== auctionId) return;
        setBanner({ type: 'skipped', text: 'SKIPPED' });
        setTimeout(() => setBanner(null), 1200);
        fetchState().catch(() => {});
      });

      socket.on('next_player', (data) => {
        if (data?.auctionId !== auctionId) return;
        setBanner(null);
        setRemainingSeconds(data.timerSeconds ?? timerSeconds);
        fetchState().catch(() => {});
      });

      socket.on('round2_started', (data) => {
        if (data?.auctionId !== auctionId) return;
        setBanner({ type: 'round2', text: 'ROUND 2 — UNSOLD PLAYERS' });
        setTimeout(() => setBanner(null), 2500);
        fetchState().catch(() => {});
      });

      socket.on('auction_closed', (data) => {
        if (data?.auctionId !== auctionId) return;
        setBanner({ type: 'closed', text: 'AUCTION COMPLETE' });
        fetchState().catch(() => {});
      });
    };

    init();

    return () => {
      mounted = false;
      stopPolling();
      const s = socketRef.current;
      if (s) {
        try {
          s.emit('leave-auction', { auctionId });
        } catch (_e) {
          // ignore
        }
        s.disconnect();
      }
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  // keep bid input in sync
  useEffect(() => {
    const next = (currentBid > 0 ? currentBid + bidIncrement : effectiveBasePrice);
    setBidAmount(String(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBid, bidIncrement, effectiveBasePrice, currentPlayer?._id]);

  const handlePlaceBid = async () => {
    const amt = Number(bidAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    try {
      const res = await auctionService.placeBid(auctionId, amt);
      setState(res.data);
    } catch (e) {
      toast.error(e.message || 'Bid failed');
    }
  };

  const handlePauseResume = async () => {
    try {
      if (state?.status === 'paused') {
        const res = await auctionService.start(auctionId);
        setState(res.data);
      } else {
        const res = await auctionService.pause(auctionId);
        setState(res.data);
      }
    } catch (e) {
      toast.error(e.message || 'Action failed');
    }
  };

  const handleSkip = async () => {
    try {
      const res = await auctionService.skip(auctionId);
      setState(res.data);
    } catch (e) {
      toast.error(e.message || 'Skip failed');
    }
  };

  const handleSellNow = async () => {
    try {
      const res = await auctionService.sellNow(auctionId);
      setState(res.data);
    } catch (e) {
      toast.error(e.message || 'Sell now failed');
    }
  };

  const handleOverride = async () => {
    const amt = Number(overrideAmount);
    if (!overrideTeamId || !Number.isFinite(amt) || amt <= 0) return;
    try {
      const res = await auctionService.override(auctionId, overrideTeamId, amt);
      setState(res.data);
      setOverrideTeamId('');
      setOverrideAmount('');
    } catch (e) {
      toast.error(e.message || 'Override failed');
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (!state) {
    return <div className="text-gray-400">Failed to load auction.</div>;
  }

  if (state.status === 'closed') {
    return (
      <div className="sports-card">
        <h2 className="text-2xl font-bold text-white mb-2">Auction Complete</h2>
        <p className="text-gray-400 mb-6">Final squads and budgets.</p>
        <div className="grid md:grid-cols-2 gap-6">
          {teams.map(t => (
            <div key={t._id} className="p-4 rounded-xl bg-sports-border/30 border border-sports-border">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-white font-bold">{t.name}</p>
                  <p className="text-gray-400 text-sm">Captain: {t.captain?.name}</p>
                </div>
                <div className={`text-right font-bold ${budgetColor(t)}`}>
                  {formatMoney(t.remainingBudget)}
                  <p className="text-xs text-gray-500 font-normal">remaining</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(t.players || []).map(p => (
                  <span key={p._id} className="px-3 py-1 rounded-full bg-sports-border text-sm text-gray-200">
                    {p.nickname || p.name} • {formatMoney(p.soldPrice || 0)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const showPaused = state.status === 'paused' || banner?.type === 'paused';

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: Teams panel */}
      <div className="space-y-4">
        <div className="sports-card flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Teams</p>
            <p className="text-xs text-gray-500">{socketOk ? 'Live connected' : 'Reconnecting (polling)'}</p>
          </div>
          <div className="text-xs text-gray-500">Remaining</div>
        </div>

        {teams.map(t => {
          const isMine = myTeam && String(myTeam._id) === String(t._id);
          return (
            <div key={t._id} className={`sports-card ${isMine ? 'border border-neon-green/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white font-bold flex items-center gap-2">
                    {t.name}
                    {isMine && <UserCheck className="w-4 h-4 text-neon-green" />}
                  </p>
                  <p className="text-gray-400 text-sm">Captain: {t.captain?.name}</p>
                </div>
                <div className={`text-right text-2xl font-bold ${budgetColor(t)}`}>
                  {formatMoney(t.remainingBudget)}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(t.players || []).map(p => (
                  <span key={p._id} className="px-3 py-1 rounded-full bg-sports-border text-sm text-gray-200">
                    {p.nickname || p.name} • {formatMoney(p.soldPrice || 0)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center: Current player */}
      <div className="relative">
        {banner && banner.type !== 'paused' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className={`px-6 py-4 rounded-2xl font-bold text-xl ${
              banner.type === 'sold' ? 'bg-neon-green/15 text-neon-green border border-neon-green/30' :
              banner.type === 'unsold' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              banner.type === 'round2' ? 'bg-gold/10 text-gold border border-gold/20' :
              'bg-sports-border text-white'
            }`}>
              {banner.text}
            </div>
          </div>
        )}

        <div className="sports-card">
          {showPaused && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-gold/10 text-gold border border-gold/20 text-center font-semibold">
              PAUSED
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white">
                {currentPlayer ? (currentPlayer.nickname || currentPlayer.name) : 'Waiting…'}
              </h2>
              {currentPlayer && (
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <span className={`px-2 py-1 text-xs rounded-full border ${roleBadgeClass(currentPlayer.role)}`}>
                    {currentPlayer.role}
                  </span>
                  {currentPlayer.battingStyle && <span className="text-xs text-gray-400">{currentPlayer.battingStyle}</span>}
                  {currentPlayer.bowlingStyle && <span className="text-xs text-gray-400">{currentPlayer.bowlingStyle}</span>}
                </div>
              )}
              {currentPlayer?.careerStats && (
                <p className="mt-3 text-gray-400 text-sm">
                  {currentPlayer.careerStats.totalRuns || 0} runs • {currentPlayer.careerStats.totalWickets || 0} wkts • {currentPlayer.careerStats.matchesPlayed || 0} matches
                </p>
              )}
            </div>
            <TimerRing remainingSeconds={showPaused ? remainingSeconds : remainingSeconds} totalSeconds={timerSeconds} />
          </div>

          <div className="mt-6 p-4 rounded-xl bg-sports-border/30 border border-sports-border">
            {currentBid > 0 ? (
              <div className="text-center">
                <p className="text-4xl font-bold text-neon-green">{formatMoney(currentBid)}</p>
                <p className="text-gray-400 mt-1">by {currentBidTeamName || '—'}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400">Base Price</p>
                <p className="text-3xl font-bold text-white">{formatMoney(effectiveBasePrice)}</p>
              </div>
            )}
          </div>

          {/* Bid controls */}
          {isCaptain() && (
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBidAmount(String(Math.max(effectiveBasePrice, Number(bidAmount || 0) - bidIncrement)))}
                  className="px-4 py-3 rounded-xl bg-sports-border text-white hover:bg-white/10"
                  disabled={!canPlaceBid}
                >
                  -{bidIncrement}
                </button>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="flex-1"
                  disabled={!canPlaceBid}
                  min={effectiveBasePrice}
                  step={bidIncrement}
                />
                <button
                  onClick={() => setBidAmount(String(Number(bidAmount || 0) + bidIncrement))}
                  className="px-4 py-3 rounded-xl bg-sports-border text-white hover:bg-white/10"
                  disabled={!canPlaceBid}
                >
                  +{bidIncrement}
                </button>
              </div>

              <button
                onClick={handlePlaceBid}
                disabled={!canPlaceBid || Number(bidAmount) > (myTeam?.remainingBudget ?? 0)}
                className="mt-4 w-full py-3 rounded-xl bg-neon-green text-sports-darker font-semibold disabled:opacity-50"
              >
                PLACE BID {formatMoney(bidAmount)}
              </button>

              {myTeam && Number(bidAmount) > (myTeam.remainingBudget ?? 0) && (
                <p className="mt-2 text-sm text-red-400">Insufficient budget.</p>
              )}
            </div>
          )}

          {/* Admin controls */}
          {isAdmin() && (
            <div className="mt-8 pt-6 border-t border-sports-border space-y-3">
              <div className="flex flex-wrap gap-3">
                <button onClick={handleSkip} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-200 hover:bg-white/10">
                  <SkipForward className="w-4 h-4" />
                  Skip Player
                </button>
                <button onClick={handlePauseResume} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-200 hover:bg-white/10">
                  {state.status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {state.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button onClick={handleSellNow} className="px-4 py-2 rounded-lg bg-gold text-sports-darker font-semibold">
                  Sell Now
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <select value={overrideTeamId} onChange={(e) => setOverrideTeamId(e.target.value)} className="w-full">
                  <option value="">Override → Assign to team…</option>
                  {teams.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={overrideAmount}
                  onChange={(e) => setOverrideAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full"
                />
                <button
                  onClick={handleOverride}
                  disabled={!overrideTeamId || !overrideAmount}
                  className="px-4 py-2 rounded-lg bg-neon-blue text-sports-darker font-semibold disabled:opacity-50"
                >
                  Confirm Override
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Queue */}
      <div className="space-y-4">
        <div className="sports-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Up Next</p>
              <p className="text-xs text-gray-500">{state.queueRemaining} remaining</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {(state.queuePreview || []).map(p => (
              <div key={p._id} className="flex items-center justify-between p-3 rounded-lg bg-sports-border/30">
                <span className="text-gray-200">{p.nickname || p.name}</span>
                <span className={`px-2 py-1 text-xs rounded-full border ${roleBadgeClass(p.role)}`}>{p.role}</span>
              </div>
            ))}
            {(state.queuePreview || []).length === 0 && (
              <p className="text-gray-500 text-sm">No queued players.</p>
            )}
          </div>
        </div>

        <div className="sports-card">
          <button
            onClick={() => setShowUnsold(v => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <p className="text-white font-semibold">Unsold Players</p>
              <p className="text-xs text-gray-500">{(state.unsoldPool || []).length} players</p>
            </div>
            {showUnsold ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showUnsold && (
            <div className="mt-4 space-y-2">
              {(state.unsoldPool || []).map(p => (
                <div key={p._id} className="flex items-center justify-between p-3 rounded-lg bg-sports-border/30">
                  <span className="text-gray-200">{p.nickname || p.name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full border ${roleBadgeClass(p.role)}`}>{p.role}</span>
                </div>
              ))}
              {(state.unsoldPool || []).length === 0 && (
                <p className="text-gray-500 text-sm">None yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

