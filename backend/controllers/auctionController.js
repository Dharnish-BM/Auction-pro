import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Auction from '../models/Auction.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

let emitToAuction = () => {};

export const setAuctionEmitters = (emitters) => {
  emitToAuction = emitters.emitToAuction || (() => {});
};

// In-memory timer store (server-authoritative)
const auctionTimers = new Map(); // auctionId -> { timeout, interval, endsAt }

const clearAuctionTimer = (auctionId) => {
  const t = auctionTimers.get(auctionId);
  if (!t) return;
  if (t.timeout) clearTimeout(t.timeout);
  if (t.interval) clearInterval(t.interval);
  auctionTimers.delete(auctionId);
};

const startAuctionTimer = (auctionId, timerSeconds) => {
  clearAuctionTimer(auctionId);
  const endsAt = Date.now() + timerSeconds * 1000;

  const interval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    emitToAuction(auctionId, 'timer_tick', { auctionId, remainingSeconds: remaining });
    if (remaining <= 0) {
      clearInterval(interval);
    }
  }, 1000);

  const timeout = setTimeout(async () => {
    try {
      await autoAdvancePlayer(auctionId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('autoAdvancePlayer error:', e);
    }
  }, timerSeconds * 1000);

  auctionTimers.set(auctionId, { timeout, interval, endsAt });
  return endsAt;
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const getMatchTeams = async (match) => {
  const teamIds = [match.teamA, match.teamB].filter(Boolean);
  if (teamIds.length < 2) return [];
  return Team.find({ _id: { $in: teamIds } })
    .populate('captain', 'name email role')
    .populate('players', 'name nickname role soldPrice');
};

const getTeamForCaptainInMatch = async (match, captainId) => {
  return Team.findOne({ captain: captainId, _id: { $in: [match.teamA, match.teamB] } })
    .populate('captain', 'name email role');
};

// @desc    Create auction for a match
// @route   POST /api/matches/:matchId/auction
// @access  Private/Admin
export const createAuction = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { budgetPerTeam, basePrice, bidIncrement, timerSeconds } = req.body;

  const match = await Match.findById(matchId);
  if (!match) throw new AppError('Match not found', 404);

  if (!['setup', 'auction'].includes(match.status)) {
    throw new AppError("Match must be in 'setup' or 'auction' status", 400);
  }

  if (!Array.isArray(match.playerPool) || match.playerPool.length < 2) {
    throw new AppError('Match must have a playerPool set with at least 2 players', 400);
  }

  const teams = await getMatchTeams(match);
  if (teams.length < 2) {
    throw new AppError('Match must have at least 2 teams', 400);
  }

  const poolPlayers = await Player.find({ _id: { $in: match.playerPool }, isActive: true }).select('_id');
  if (poolPlayers.length !== match.playerPool.length) {
    throw new AppError('Match playerPool contains invalid or inactive players', 400);
  }

  const existing = await Auction.findOne({ matchId: match._id, status: { $in: ['pending', 'active', 'paused', 'round2'] } });
  if (existing) {
    throw new AppError('An auction already exists for this match', 400);
  }

  const queue = shuffle(match.playerPool.map(String));

  const auction = await Auction.create({
    matchId: match._id,
    playerPool: match.playerPool,
    queue,
    unsoldPool: [],
    currentPlayer: null,
    bids: [],
    bidHistory: [],
    highestBid: 0,
    highestBidder: null,
    highestBidderName: '',
    config: {
      teams: teams.length,
      budgetPerTeam: Number(budgetPerTeam) || 0,
      basePrice: Number(basePrice) || 0,
      bidIncrement: Number(bidIncrement) || 0,
      timerSeconds: Number(timerSeconds) || 15
    },
    status: 'pending',
    startTime: null,
    endTime: null
  });

  match.status = 'auction';
  await match.save();

  res.status(201).json({ success: true, data: auction });
});

// @desc    Start auction (auto-flow)
// @route   POST /api/auctions/:id/start
// @access  Private/Admin
export const startAuction = asyncHandler(async (req, res) => {
  const auctionId = req.params.id;
  const auction = await Auction.findById(auctionId);
  if (!auction) throw new AppError('Auction not found', 404);

  if (!['pending', 'paused'].includes(auction.status)) {
    throw new AppError("Auction status must be 'pending' or 'paused'", 400);
  }

  // Resume if paused and a current player is already set
  if (auction.status === 'paused' && auction.currentPlayer) {
    auction.status = 'active';
    auction.timeRemaining = auction.config.timerSeconds;
    await auction.save();

    const endsAt = startAuctionTimer(auction._id.toString(), auction.config.timerSeconds);
    const populated = await Auction.findById(auction._id).populate('currentPlayer', 'name nickname role battingStyle bowlingStyle profilePhoto');

    emitToAuction(auction._id.toString(), 'auction_resumed', {
      auctionId: auction._id.toString(),
      currentPlayer: populated.currentPlayer,
      queueRemaining: populated.queue.length,
      timerSeconds: auction.config.timerSeconds,
      endsAt
    });

    return res.json({ success: true, data: populated });
  }

  if (!auction.queue?.length) {
    throw new AppError('Auction queue is empty', 400);
  }

  const nextPlayerId = auction.queue.shift();
  auction.currentPlayer = nextPlayerId;
  auction.playerId = nextPlayerId; // legacy
  const p = await Player.findById(nextPlayerId).select('name nickname role battingStyle bowlingStyle basePrice profilePhoto');
  auction.playerName = p?.nickname || p?.name || '';
  auction.basePrice = auction.config.basePrice || p?.basePrice || 0;
  auction.highestBid = 0;
  auction.highestBidder = null;
  auction.highestBidderName = '';
  auction.bids = [];
  auction.bidHistory = [];
  auction.status = 'active';
  auction.startTime = auction.startTime || new Date();
  auction.timeRemaining = auction.config.timerSeconds;

  await auction.save();

  const endsAt = startAuctionTimer(auction._id.toString(), auction.config.timerSeconds);

  const populated = await Auction.findById(auction._id).populate('currentPlayer', 'name nickname role battingStyle bowlingStyle profilePhoto');

  emitToAuction(auction._id.toString(), 'auction_started', {
    auctionId: auction._id.toString(),
    currentPlayer: populated.currentPlayer,
    queueRemaining: populated.queue.length,
    timerSeconds: auction.config.timerSeconds,
    endsAt
  });

  res.json({ success: true, data: populated });
});

// @desc    Place bid
// @route   POST /api/auctions/:id/bid
// @access  Private/Captain
export const placeBid = asyncHandler(async (req, res) => {
  const auctionId = req.params.id;
  const { amount } = req.body;
  const bidAmount = Number(amount);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    throw new AppError('amount must be a positive number', 400);
  }

  const auction = await Auction.findById(auctionId);
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'active') throw new AppError('Auction is not active', 400);
  if (!auction.currentPlayer) throw new AppError('No current player in auction', 400);

  const match = await Match.findById(auction.matchId);
  if (!match) throw new AppError('Match not found for this auction', 404);

  const team = await getTeamForCaptainInMatch(match, req.user._id);
  if (!team) throw new AppError('You are not assigned to a team in this match', 400);

  const min = auction.highestBid > 0
    ? auction.highestBid + (auction.config.bidIncrement || 0)
    : (auction.config.basePrice || 0);

  if (bidAmount < min) {
    throw new AppError(`Bid must be at least ${min}`, 400);
  }

  if (bidAmount > team.remainingBudget) {
    throw new AppError('Insufficient budget', 400);
  }

  if (auction.highestBidder && String(auction.highestBidder) === String(team._id)) {
    throw new AppError('You are already the highest bidder', 400);
  }

  auction.bids.push({
    teamId: team._id,
    captainId: req.user._id,
    amount: bidAmount,
    timestamp: new Date()
  });

  // keep legacy bidHistory for existing UI
  auction.bidHistory.push({
    bidder: team._id,
    bidderName: team.name,
    amount: bidAmount,
    timestamp: new Date()
  });

  auction.highestBid = bidAmount;
  auction.highestBidder = team._id;
  auction.highestBidderName = team.name;

  await auction.save();

  const endsAt = startAuctionTimer(auction._id.toString(), auction.config.timerSeconds);

  emitToAuction(auction._id.toString(), 'new_bid', {
    auctionId: auction._id.toString(),
    amount: bidAmount,
    teamId: team._id.toString(),
    teamName: team.name,
    remainingBudget: team.remainingBudget,
    timerSeconds: auction.config.timerSeconds,
    endsAt
  });

  const state = await getAuctionStateInternal(auction._id.toString());
  res.json({ success: true, data: state });
});

const finalizeSold = async ({ auction, match, winningTeam, soldFor, player }) => {
  // Update player
  player.isSold = true;
  player.soldTo = winningTeam._id;
  player.soldPrice = soldFor;
  player.auctionStatus = 'sold';
  player.auctionHistory = player.auctionHistory || [];
  player.auctionHistory.push({
    matchId: match._id,
    teamId: winningTeam._id,
    soldFor,
    unsold: false
  });
  await player.save();

  // Update team
  if (!winningTeam.players.map(String).includes(String(player._id))) {
    winningTeam.players.push(player._id);
  }
  winningTeam.remainingBudget = Math.max(0, (winningTeam.remainingBudget || 0) - soldFor);
  await winningTeam.save();

  emitToAuction(auction._id.toString(), 'player_sold', {
    auctionId: auction._id.toString(),
    player,
    team: winningTeam,
    amount: soldFor
  });
};

const finalizeUnsold = async ({ auction, match, player }) => {
  auction.unsoldPool = auction.unsoldPool || [];
  auction.unsoldPool.push(player._id);
  player.auctionStatus = 'unsold';
  player.auctionHistory = player.auctionHistory || [];
  player.auctionHistory.push({
    matchId: match._id,
    teamId: null,
    soldFor: 0,
    unsold: true
  });
  await player.save();

  emitToAuction(auction._id.toString(), 'player_unsold', {
    auctionId: auction._id.toString(),
    player
  });
};

// internal async function
async function autoAdvancePlayer(auctionId, forcedBid = null) {
  clearAuctionTimer(auctionId);

  const auction = await Auction.findById(auctionId);
  if (!auction) return;
  if (auction.status !== 'active') return;

  const match = await Match.findById(auction.matchId);
  if (!match) return;

  const currentPlayerId = auction.currentPlayer;
  const player = currentPlayerId ? await Player.findById(currentPlayerId) : null;
  if (!player) return;

  // Determine winning bid
  let winning = null;
  if (forcedBid) {
    winning = forcedBid;
  } else if (Array.isArray(auction.bids) && auction.bids.length) {
    winning = auction.bids.reduce((best, b) => (b.amount > best.amount ? b : best), auction.bids[0]);
  }

  if (winning) {
    const winningTeam = await Team.findById(winning.teamId).populate('players', 'name nickname role');
    if (winningTeam) {
      await finalizeSold({
        auction,
        match,
        winningTeam,
        soldFor: winning.amount,
        player
      });
    }
  } else {
    await finalizeUnsold({ auction, match, player });
  }

  // Advance to next player / round2 / close
  auction.bids = [];
  auction.bidHistory = [];
  auction.highestBid = 0;
  auction.highestBidder = null;
  auction.highestBidderName = '';

  if (auction.queue?.length) {
    const nextPlayerId = auction.queue.shift();
    auction.currentPlayer = nextPlayerId;
    auction.playerId = nextPlayerId;
    const nextPlayer = await Player.findById(nextPlayerId).select('name nickname basePrice');
    auction.playerName = nextPlayer?.nickname || nextPlayer?.name || '';
    auction.basePrice = auction.config.basePrice || nextPlayer?.basePrice || 0;
    auction.timeRemaining = auction.config.timerSeconds;
    await auction.save();

    const endsAt = startAuctionTimer(auction._id.toString(), auction.config.timerSeconds);
    const populated = await Auction.findById(auction._id).populate('currentPlayer', 'name nickname role battingStyle bowlingStyle profilePhoto');

    emitToAuction(auction._id.toString(), 'next_player', {
      auctionId: auction._id.toString(),
      currentPlayer: populated.currentPlayer,
      queueRemaining: populated.queue.length,
      timerSeconds: auction.config.timerSeconds,
      endsAt
    });
    return;
  }

  // queue empty
  if (auction.status === 'active') {
    if (auction.unsoldPool?.length) {
      auction.status = 'round2';
      auction.queue = shuffle(auction.unsoldPool.map(String));
      auction.unsoldPool = [];
      auction.config.basePrice = Math.floor((auction.config.basePrice || 0) / 2);
      await auction.save();

      emitToAuction(auction._id.toString(), 'round2_started', {
        auctionId: auction._id.toString(),
        basePrice: auction.config.basePrice,
        queueRemaining: auction.queue.length
      });

      // Immediately move to next player in round2
      if (auction.queue.length) {
        const nextPlayerId = auction.queue.shift();
        auction.currentPlayer = nextPlayerId;
        auction.playerId = nextPlayerId;
        const nextPlayer = await Player.findById(nextPlayerId).select('name nickname basePrice');
        auction.playerName = nextPlayer?.nickname || nextPlayer?.name || '';
        auction.basePrice = auction.config.basePrice || nextPlayer?.basePrice || 0;
        auction.status = 'active';
        auction.timeRemaining = auction.config.timerSeconds;
        await auction.save();

        const endsAt = startAuctionTimer(auction._id.toString(), auction.config.timerSeconds);
        const populated = await Auction.findById(auction._id).populate('currentPlayer', 'name nickname role battingStyle bowlingStyle profilePhoto');
        emitToAuction(auction._id.toString(), 'next_player', {
          auctionId: auction._id.toString(),
          currentPlayer: populated.currentPlayer,
          queueRemaining: populated.queue.length,
          timerSeconds: auction.config.timerSeconds,
          endsAt
        });
      }
      return;
    }

    auction.status = 'closed';
    auction.currentPlayer = null;
    auction.playerId = null;
    auction.playerName = '';
    auction.endTime = new Date();
    await auction.save();

    match.status = 'auction_done';
    await match.save();

    emitToAuction(auction._id.toString(), 'auction_closed', { auctionId: auction._id.toString() });
  }
}

// @desc    Pause auction
// @route   POST /api/auctions/:id/pause
// @access  Private/Admin
export const pauseAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) throw new AppError('Auction not found', 404);
  clearAuctionTimer(auction._id.toString());
  auction.status = 'paused';
  await auction.save();
  emitToAuction(auction._id.toString(), 'auction_paused', { auctionId: auction._id.toString() });
  res.json({ success: true, data: auction });
});

// @desc    Admin override current player winner
// @route   POST /api/auctions/:id/override
// @access  Private/Admin
export const overrideBid = asyncHandler(async (req, res) => {
  const { teamId, amount } = req.body;
  if (!teamId || !amount) throw new AppError('teamId and amount are required', 400);
  const auction = await Auction.findById(req.params.id);
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'active') throw new AppError('Auction is not active', 400);
  clearAuctionTimer(auction._id.toString());

  emitToAuction(auction._id.toString(), 'admin_override', { auctionId: auction._id.toString(), teamId, amount });
  await autoAdvancePlayer(auction._id.toString(), { teamId, amount: Number(amount) });
  const state = await getAuctionStateInternal(auction._id.toString());
  res.json({ success: true, data: state });
});

// @desc    Skip current player (send to unsoldPool)
// @route   POST /api/auctions/:id/skip
// @access  Private/Admin
export const skipCurrentPlayer = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'active') throw new AppError('Auction is not active', 400);
  clearAuctionTimer(auction._id.toString());

  emitToAuction(auction._id.toString(), 'player_skipped', { auctionId: auction._id.toString(), playerId: auction.currentPlayer });
  // Advance with no bids, but force "no bid" behavior by clearing bids
  auction.bids = [];
  await auction.save();
  await autoAdvancePlayer(auction._id.toString(), null);
  const state = await getAuctionStateInternal(auction._id.toString());
  res.json({ success: true, data: state });
});

// @desc    Sell now (freeze bidding and advance with current highest bid)
// @route   POST /api/auctions/:id/sell-now
// @access  Private/Admin
export const sellNow = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'active') throw new AppError('Auction is not active', 400);

  clearAuctionTimer(auction._id.toString());
  emitToAuction(auction._id.toString(), 'sell_now', { auctionId: auction._id.toString() });

  if (auction.highestBidder && auction.highestBid > 0) {
    await autoAdvancePlayer(auction._id.toString(), { teamId: auction.highestBidder, amount: auction.highestBid });
  } else {
    await autoAdvancePlayer(auction._id.toString(), null);
  }

  const state = await getAuctionStateInternal(auction._id.toString());
  res.json({ success: true, data: state });
});

async function getAuctionStateInternal(auctionId) {
  const auction = await Auction.findById(auctionId)
    .populate('currentPlayer', 'name nickname role battingStyle bowlingStyle profilePhoto careerStats')
    .populate('unsoldPool', 'name nickname role battingStyle bowlingStyle profilePhoto');

  if (!auction) return null;

  const match = await Match.findById(auction.matchId);
  const teams = match ? await getMatchTeams(match) : [];

  const queuePreviewIds = (auction.queue || []).slice(0, 5);
  const queuePreview = queuePreviewIds.length
    ? await Player.find({ _id: { $in: queuePreviewIds } }).select('name nickname role battingStyle bowlingStyle')
    : [];

  return {
    auctionId: auction._id,
    matchId: auction.matchId,
    status: auction.status,
    config: auction.config,
    currentPlayer: auction.currentPlayer,
    queueRemaining: auction.queue?.length || 0,
    queuePreview,
    unsoldPool: auction.unsoldPool || [],
    bids: auction.bids || [],
    highestBid: auction.highestBid,
    highestBidder: auction.highestBidder,
    highestBidderName: auction.highestBidderName,
    teams
  };
}

// @desc    Get auction state for initial page load
// @route   GET /api/auctions/:id/state
// @access  Private
export const getAuctionState = asyncHandler(async (req, res) => {
  const state = await getAuctionStateInternal(req.params.id);
  if (!state) throw new AppError('Auction not found', 404);
  res.json({ success: true, data: state });
});

