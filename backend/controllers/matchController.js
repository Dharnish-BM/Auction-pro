import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Match from '../models/Match.js';
import Auction from '../models/Auction.js';
import LiveMatchState from '../models/LiveMatchState.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import { emitToMatch } from '../sockets/scoreboardSocket.js';
import { aggregateCareerStats } from '../utils/statsAggregator.js';

const VALID_MATCH_STATUS_TRANSITIONS = new Map([
  ['setup', new Set(['auction'])],
  ['auction', new Set(['auction_done'])],
  ['auction_done', new Set(['live'])],
  ['live', new Set(['innings_break', 'completed'])],
  ['innings_break', new Set(['live', 'completed'])],
  ['completed', new Set([])]
]);

const assertValidTransition = (from, to) => {
  const allowed = VALID_MATCH_STATUS_TRANSITIONS.get(from);
  if (!allowed || !allowed.has(to)) {
    const allowedList = allowed ? Array.from(allowed).join(', ') : '(none)';
    throw new AppError(`Invalid status transition: ${from} → ${to}. Allowed: ${allowedList}`, 400);
  }
};

const getTeamSquadPlayerIds = (team) => {
  const ids = (team.players || []).map(p => (p?._id ? p._id : p)).filter(Boolean);
  return ids.map(String);
};

const assertPlayersInPool = (match, playerIds) => {
  const poolSet = new Set((match.playerPool || []).map(String));
  for (const id of playerIds) {
    if (!poolSet.has(String(id))) {
      throw new AppError('All players must be in this match playerPool', 400);
    }
  }
};

const symbolForDelivery = (d) => {
  if (d.isWicket) return 'W';
  if (d.extraType === 'wide') return 'Wd';
  if (d.extraType === 'noBall') return 'Nb';
  if (d.isSix) return '6';
  if (d.isBoundary) return '4';
  if ((d.totalRuns || 0) === 0) return '0';
  return String(d.totalRuns || 0);
};

const computeBatterStats = (innings, batterId) => {
  const id = String(batterId);
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;

  for (const over of innings.overs || []) {
    for (const d of over.deliveries || []) {
      if (String(d.batsmanId) !== id) continue;
      runs += d.runs || 0;
      if (d.isLegalDelivery) balls += 1;
      if (d.isBoundary) fours += 1;
      if (d.isSix) sixes += 1;
    }
  }

  return { runs, balls, fours, sixes };
};

const computeBowlerStats = (innings, bowlerId) => {
  const id = String(bowlerId);
  let legalBalls = 0;
  let runs = 0;
  let wickets = 0;
  let wides = 0;
  let noBalls = 0;

  for (const over of innings.overs || []) {
    for (const d of over.deliveries || []) {
      if (String(d.bowlerId) !== id) continue;
      runs += d.totalRuns || 0;
      if (d.extraType === 'wide') wides += 1;
      if (d.extraType === 'noBall') noBalls += 1;
      if (d.isLegalDelivery) legalBalls += 1;
      if (d.isWicket && d.wicketType && d.wicketType !== 'runOut') wickets += 1;
    }
  }

  const overs = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  return { overs, runs, wickets, wides, noBalls };
};

const getActiveInningsAndOver = (match) => {
  const innings = [...(match.innings || [])].reverse().find(i => !i.isCompleted);
  if (!innings) return { innings: null, over: null };
  const over = [...(innings.overs || [])].reverse().find(o => !o.isCompleted);
  return { innings, over };
};

const getLastNDeliveries = (match, n) => {
  const balls = [];
  for (let i = (match.innings || []).length - 1; i >= 0; i--) {
    const inn = match.innings[i];
    for (let o = (inn.overs || []).length - 1; o >= 0; o--) {
      const over = inn.overs[o];
      for (let d = (over.deliveries || []).length - 1; d >= 0; d--) {
        balls.push(over.deliveries[d]);
        if (balls.length >= n) return balls;
      }
    }
  }
  return balls;
};

const recomputeLiveState = async (matchId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new AppError('Match not found', 404);
  const live = await LiveMatchState.findOne({ matchId: match._id });
  if (!live) throw new AppError('LiveMatchState not found', 404);

  const { innings, over } = getActiveInningsAndOver(match);
  if (!innings || !over) {
    live.lastSixBalls = [];
    live.strikerStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    live.nonStrikerStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    live.currentBowlerStats = { overs: '0.0', runs: 0, wickets: 0, wides: 0, noBalls: 0 };
    live.updatedAt = new Date();
    await live.save();
    return live;
  }

  let strikerId = innings.startingStrikerId;
  let nonStrikerId = innings.startingNonStrikerId;
  let strikerName = live.strikerName;
  let nonStrikerName = live.nonStrikerName;
  let currentBowlerId = innings.startingBowlerId;

  // Replay deliveries in this innings to figure striker/non-striker and freehit
  let isFreehitNext = false;
  for (const ov of innings.overs || []) {
    for (const d of ov.deliveries || []) {
      // update current bowler
      currentBowlerId = d.bowlerId;

      // consume freehit
      const wasFreehit = isFreehitNext;
      isFreehitNext = d.extraType === 'noBall';

      // odd legal runs swap
      if (d.isLegalDelivery && (d.totalRuns % 2 !== 0)) {
        [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
      }

      // wicket brings new batter
      if (d.isWicket && d.nextBatsmanId) {
        // assume striker replaced unless dismissedBatsmanId explicitly equals non-striker
        const dismissed = d.dismissedBatsmanId ? String(d.dismissedBatsmanId) : String(strikerId);
        if (String(nonStrikerId) === dismissed) {
          nonStrikerId = d.nextBatsmanId;
        } else {
          strikerId = d.nextBatsmanId;
        }
      }

      // end of over crossing (only when over completed and delivery was last legal)
      if (ov.isCompleted && d.isLegalDelivery && d.deliveryNumber === 6) {
        [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
      }

      // prevent unused
      // eslint-disable-next-line no-unused-vars
      const _wasFreehit = wasFreehit;
    }
  }

  // hydrate names if possible
  const [striker, nonStriker, bowler] = await Promise.all([
    strikerId ? Player.findById(strikerId).select('name nickname') : null,
    nonStrikerId ? Player.findById(nonStrikerId).select('name nickname') : null,
    currentBowlerId ? Player.findById(currentBowlerId).select('name nickname') : null
  ]);
  strikerName = striker?.nickname || striker?.name || '';
  nonStrikerName = nonStriker?.nickname || nonStriker?.name || '';

  live.currentInnings = innings.inningsNumber;
  live.strikerId = strikerId;
  live.strikerName = strikerName;
  live.nonStrikerId = nonStrikerId;
  live.nonStrikerName = nonStrikerName;
  live.currentBowlerId = currentBowlerId;
  live.currentBowlerName = bowler?.nickname || bowler?.name || live.currentBowlerName;
  live.isFreehitNext = isFreehitNext;
  live.lastSixBalls = getLastNDeliveries(match, 6).map(symbolForDelivery).slice(0, 6);

  live.strikerStats = strikerId ? computeBatterStats(innings, strikerId) : { runs: 0, balls: 0, fours: 0, sixes: 0 };
  live.nonStrikerStats = nonStrikerId ? computeBatterStats(innings, nonStrikerId) : { runs: 0, balls: 0, fours: 0, sixes: 0 };
  live.currentBowlerStats = currentBowlerId ? computeBowlerStats(innings, currentBowlerId) : { overs: '0.0', runs: 0, wickets: 0, wides: 0, noBalls: 0 };

  live.updatedAt = new Date();
  await live.save();
  return live;
};

// @desc    Get all matches
// @route   GET /api/matches
// @access  Private
export const getMatches = asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  let query = {};
  if (status) query.status = status;

  const matches = await Match.find(query)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color')
    .populate('winner', 'name logo')
    .populate('manOfTheMatch', 'name role')
    .sort({ date: 1, time: 1 });

  res.json({
    success: true,
    count: matches.length,
    data: matches
  });
});

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Private
export const getMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('teamA', 'name logo color captain')
    .populate('teamB', 'name logo color captain')
    .populate('winner', 'name logo')
    .populate('manOfTheMatch', 'name role')
    .populate('scorecard.currentBatsmen.player', 'name')
    .populate('scorecard.currentBowler.player', 'name');

  if (!match) {
    throw new AppError('Match not found', 404);
  }

  // Calculate derived stats
  const teamARunRate = match.calculateRunRate('A');
  const teamBRunRate = match.calculateRunRate('B');
  const requiredRunRate = match.calculateRequiredRunRate();

  res.json({
    success: true,
    data: {
      ...match.toObject(),
      derivedStats: {
        teamARunRate,
        teamBRunRate,
        requiredRunRate
      }
    }
  });
});

// @desc    Create new match
// @route   POST /api/matches
// @access  Private/Admin
export const createMatch = asyncHandler(async (req, res) => {
  const { teamA, teamB, date, time, location, venue, oversPerInnings, overs, format, playerPool } = req.body;

  // Validate teams exist
  const [teamADoc, teamBDoc] = await Promise.all([
    Team.findById(teamA),
    Team.findById(teamB)
  ]);

  if (!teamADoc || !teamBDoc) {
    throw new AppError('One or both teams not found', 404);
  }

  if (teamA.toString() === teamB.toString()) {
    throw new AppError('Teams must be different', 400);
  }

  const match = await Match.create({
    teamA,
    teamAName: teamADoc.name,
    teamB,
    teamBName: teamBDoc.name,
    date: new Date(date),
    time,
    location,
    ...(venue ? { venue } : {}),
    oversPerInnings: oversPerInnings || 10,
    ...(typeof overs === 'number' ? { overs } : {}),
    ...(format ? { format } : {}),
    ...(Array.isArray(playerPool) ? { playerPool } : {}),
    status: 'setup'
  });

  const populatedMatch = await Match.findById(match._id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color');

  res.status(201).json({
    success: true,
    message: 'Match created successfully',
    data: populatedMatch
  });
});

// @desc    Update match
// @route   PUT /api/matches/:id
// @access  Private/Admin
export const updateMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  const { teamA, teamB, date, time, location, status, oversPerInnings } = req.body;

  // Validate teams if provided
  if (teamA || teamB) {
    const newTeamA = teamA || match.teamA;
    const newTeamB = teamB || match.teamB;
    
    if (newTeamA.toString() === newTeamB.toString()) {
      throw new AppError('Teams must be different', 400);
    }

    const [teamADoc, teamBDoc] = await Promise.all([
      Team.findById(newTeamA),
      Team.findById(newTeamB)
    ]);

    if (!teamADoc || !teamBDoc) {
      throw new AppError('One or both teams not found', 404);
    }

    match.teamA = newTeamA;
    match.teamAName = teamADoc.name;
    match.teamB = newTeamB;
    match.teamBName = teamBDoc.name;
  }

  if (date) match.date = new Date(date);
  if (time) match.time = time;
  if (location) match.location = location;
  if (status) match.status = status;
  if (oversPerInnings) match.oversPerInnings = oversPerInnings;

  await match.save();

  const updatedMatch = await Match.findById(match._id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color');

  res.json({
    success: true,
    message: 'Match updated successfully',
    data: updatedMatch
  });
});

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private/Admin
export const deleteMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  await match.deleteOne();

  res.json({
    success: true,
    message: 'Match deleted successfully'
  });
});

// @desc    Start match (toss and innings selection)
// @route   POST /api/matches/:id/start
// @access  Private/Admin
export const startMatch = asyncHandler(async (req, res) => {
  const { tossWinner, tossDecision } = req.body;
  
  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  if (match.status !== 'upcoming') {
    throw new AppError('Match has already started', 400);
  }

  match.tossWinner = tossWinner;
  match.tossDecision = tossDecision;
  match.status = 'live';
  
  // Determine batting team based on toss decision
  const teamAWonToss = tossWinner.toString() === match.teamA.toString();
  const teamABatsFirst = (teamAWonToss && tossDecision === 'bat') || 
                         (!teamAWonToss && tossDecision === 'bowl');
  
  match.scorecard.currentInnings = teamABatsFirst ? 'teamA' : 'teamB';
  match.battingFirst = teamABatsFirst ? match.teamA : match.teamB;

  await match.save();

  const updatedMatch = await Match.findById(match._id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color');

  res.json({
    success: true,
    message: 'Match started successfully',
    data: updatedMatch
  });
});

// @desc    Update score
// @route   PATCH /api/matches/:id/score
// @access  Private/Admin
export const updateScore = asyncHandler(async (req, res) => {
  const { runs, isWicket, isWide, isNoBall, isBye, isLegBye, batsmanId, bowlerId } = req.body;
  
  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  if (match.status !== 'live') {
    throw new AppError('Match is not live', 400);
  }

  const isTeamA = match.scorecard.currentInnings === 'teamA';
  const currentScore = isTeamA ? match.scorecard.teamAScore : match.scorecard.teamBScore;

  // Calculate runs to add
  let runsToAdd = runs || 0;
  let ballCounts = true;

  if (isWide) {
    match.scorecard.extras.wides++;
    ballCounts = false;
    runsToAdd++;
  }

  if (isNoBall) {
    match.scorecard.extras.noBalls++;
    runsToAdd++;
  }

  if (isBye) {
    match.scorecard.extras.byes += runs || 0;
    ballCounts = false;
  }

  if (isLegBye) {
    match.scorecard.extras.legByes += runs || 0;
    ballCounts = false;
  }

  // Update score
  currentScore.runs += runsToAdd;
  
  if (ballCounts) {
    currentScore.balls++;
    if (currentScore.balls === 6) {
      currentScore.overs++;
      currentScore.balls = 0;
    }
  }

  // Update wickets
  if (isWicket) {
    currentScore.wickets++;
    match.scorecard.fallOfWickets.push({
      wicket: currentScore.wickets,
      runs: currentScore.runs,
      over: currentScore.overs + (currentScore.balls / 10),
      batsman: batsmanId || 'Unknown'
    });
  }

  // Update extras total
  match.scorecard.extras.total = 
    match.scorecard.extras.wides + 
    match.scorecard.extras.noBalls + 
    match.scorecard.extras.byes + 
    match.scorecard.extras.legByes;

  // Check for innings end
  const totalBalls = currentScore.overs * 6 + currentScore.balls;
  const maxBalls = match.oversPerInnings * 6;
  
  if (currentScore.wickets >= 10 || totalBalls >= maxBalls) {
    // Innings end
    if (isTeamA) {
      match.scorecard.target = currentScore.runs + 1;
      match.scorecard.currentInnings = 'teamB';
    } else {
      // Match end
      match.status = 'completed';
      const teamARuns = match.scorecard.teamAScore.runs;
      const teamBRuns = match.scorecard.teamBScore.runs;
      
      if (teamARuns > teamBRuns) {
        match.winner = match.teamA;
      } else if (teamBRuns > teamARuns) {
        match.winner = match.teamB;
      }
      // Tie - no winner
    }
  }

  await match.save();

  const updatedMatch = await Match.findById(match._id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color')
    .populate('winner', 'name logo');

  res.json({
    success: true,
    message: 'Score updated',
    data: updatedMatch
  });
});

// @desc    Update batsman stats
// @route   PATCH /api/matches/:id/batsmen
// @access  Private/Admin
export const updateBatsmen = asyncHandler(async (req, res) => {
  const { batsmen } = req.body;
  
  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  match.scorecard.currentBatsmen = batsmen;
  await match.save();

  res.json({
    success: true,
    message: 'Batsmen updated',
    data: match.scorecard.currentBatsmen
  });
});

// @desc    Update bowler
// @route   PATCH /api/matches/:id/bowler
// @access  Private/Admin
export const updateBowler = asyncHandler(async (req, res) => {
  const { bowler } = req.body;
  
  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  match.scorecard.currentBowler = bowler;
  await match.save();

  res.json({
    success: true,
    message: 'Bowler updated',
    data: match.scorecard.currentBowler
  });
});

// @desc    End match
// @route   POST /api/matches/:id/end
// @access  Private/Admin
export const endMatch = asyncHandler(async (req, res) => {
  const { winnerId, manOfTheMatchId } = req.body;
  
  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  match.status = 'completed';
  if (winnerId) match.winner = winnerId;
  if (manOfTheMatchId) match.manOfTheMatch = manOfTheMatchId;

  await match.save();

  // Update team stats
  if (winnerId) {
    const winner = await Team.findById(winnerId);
    const loserId = winnerId.toString() === match.teamA.toString() ? match.teamB : match.teamA;
    const loser = await Team.findById(loserId);

    if (winner) {
      winner.matchesPlayed++;
      winner.matchesWon++;
      await winner.save();
    }

    if (loser) {
      loser.matchesPlayed++;
      loser.matchesLost++;
      await loser.save();
    }
  }

  const updatedMatch = await Match.findById(match._id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color')
    .populate('winner', 'name logo')
    .populate('manOfTheMatch', 'name role');

  res.json({
    success: true,
    message: 'Match ended',
    data: updatedMatch
  });
});

// @desc    Get upcoming matches
// @route   GET /api/matches/upcoming/list
// @access  Private
export const getUpcomingMatches = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const matches = await Match.find({
    status: { $in: ['setup', 'upcoming'] },
    date: { $gte: today }
  })
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color')
    .sort({ date: 1, time: 1 })
    .limit(10);

  res.json({
    success: true,
    count: matches.length,
    data: matches
  });
});

// @desc    Get live matches
// @route   GET /api/matches/live/list
// @access  Private
export const getLiveMatches = asyncHandler(async (req, res) => {
  const matches = await Match.find({ status: 'live' })
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color');

  res.json({
    success: true,
    count: matches.length,
    data: matches
  });
});

// @desc    Set player pool for a match
// @route   POST /api/matches/:id/pool
// @access  Private/Admin
export const setPlayerPool = asyncHandler(async (req, res) => {
  const { playerIds } = req.body;
  if (!Array.isArray(playerIds)) {
    throw new AppError('playerIds must be an array', 400);
  }

  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  if (match.status !== 'setup') {
    throw new AppError("Player pool can only be set when match status is 'setup'", 400);
  }

  const uniquePlayerIds = [...new Set(playerIds.map(String))];
  const players = await Player.find({
    _id: { $in: uniquePlayerIds },
    isActive: true
  }).select('_id');

  if (players.length !== uniquePlayerIds.length) {
    throw new AppError('One or more playerIds are invalid or inactive', 400);
  }

  match.playerPool = uniquePlayerIds;
  await match.save();

  const updated = await Match.findById(match._id).populate(
    'playerPool',
    'name nickname role battingStyle bowlingStyle'
  );

  res.json({
    success: true,
    message: 'Player pool set successfully',
    data: updated
  });
});

// @desc    Get player pool for a match + all active players not in pool
// @route   GET /api/matches/:id/pool
// @access  Private
export const getPlayerPool = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id).populate(
    'playerPool',
    'name nickname role battingStyle bowlingStyle careerStats'
  );

  if (!match) {
    throw new AppError('Match not found', 404);
  }

  const poolIds = (match.playerPool || []).map(p => p._id);

  const absentPlayers = await Player.find({
    isActive: true,
    _id: { $nin: poolIds }
  }).select('name nickname role battingStyle bowlingStyle careerStats');

  res.json({
    success: true,
    data: {
      matchId: match._id,
      playerPool: match.playerPool,
      absentPlayers
    }
  });
});

// @desc    Update match status (internal helper + endpoint)
// @route   PATCH /api/matches/:id/status
// @access  Private/Admin
export const updateMatchStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new AppError('status is required', 400);
  }

  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  assertValidTransition(match.status, status);
  match.status = status;
  await match.save();

  const updated = await Match.findById(match._id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color')
    .populate('playerPool', 'name nickname role battingStyle bowlingStyle');

  res.json({
    success: true,
    message: 'Match status updated',
    data: updated
  });
});

// @desc    Set toss and go live
// @route   POST /api/matches/:id/toss
// @access  Private/Admin
export const setToss = asyncHandler(async (req, res) => {
  const { tossWinnerId, battingFirstId } = req.body;
  if (!tossWinnerId || !battingFirstId) {
    throw new AppError('tossWinnerId and battingFirstId are required', 400);
  }

  const match = await Match.findById(req.params.id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  if (match.status !== 'auction_done') {
    throw new AppError("Toss can only be set when match status is 'auction_done'", 400);
  }

  // Teams formed in this match's auction are inferred from auctions belonging to this match.
  const auctionTeamIds = await Auction.distinct('soldTo', { matchId: match._id, soldTo: { $ne: null } });
  const allowedTeamIds = auctionTeamIds.map(String);

  if (!allowedTeamIds.includes(String(tossWinnerId)) || !allowedTeamIds.includes(String(battingFirstId))) {
    throw new AppError('Both teams must be teams formed in this match auction', 400);
  }

  const [tossWinnerTeam, battingFirstTeam] = await Promise.all([
    Team.findById(tossWinnerId),
    Team.findById(battingFirstId)
  ]);
  if (!tossWinnerTeam || !battingFirstTeam) {
    throw new AppError('One or both teams not found', 404);
  }

  match.tossWinner = tossWinnerId;
  match.battingFirst = battingFirstId;
  match.status = 'live';
  await match.save();

  await LiveMatchState.findOneAndUpdate(
    { matchId: match._id },
    { $setOnInsert: { matchId: match._id, currentInnings: 1 } },
    { upsert: true, new: true }
  );

  const updated = await Match.findById(match._id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color')
    .populate('tossWinner', 'name logo color')
    .populate('battingFirst', 'name logo color');

  res.json({
    success: true,
    message: 'Toss set and match is now live',
    data: updated
  });
});

// @desc    Match overview (one call for match detail page)
// @route   GET /api/matches/:id/overview
// @access  Private
export const getMatchOverview = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color')
    .populate('tossWinner', 'name logo color')
    .populate('battingFirst', 'name logo color')
    .populate('playerPool', 'name nickname role battingStyle bowlingStyle careerStats')
    .populate('winner', 'name logo color');

  if (!match) {
    throw new AppError('Match not found', 404);
  }

  // Auction summary (who got whom, for how much) for this match
  const auctionRows = await Auction.find({ matchId: match._id, status: { $in: ['closed', 'unsold', 'completed'] } })
    .populate('playerId', 'name nickname role battingStyle bowlingStyle')
    .populate('soldTo', 'name logo color')
    .sort({ createdAt: 1 });

  const auctionSummary = {
    status: match.status,
    sold: auctionRows
      .filter(a => a.soldTo)
      .map(a => ({
        player: a.playerId,
        team: a.soldTo,
        soldFor: a.soldPrice ?? a.highestBid ?? null
      })),
    unsold: auctionRows
      .filter(a => !a.soldTo)
      .map(a => ({
        player: a.playerId
      }))
  };

  // Match-scoped teams/squads inferred from auction results
  const teamIds = [...new Set(auctionRows.filter(a => a.soldTo).map(a => String(a.soldTo._id)))];
  const teams = await Team.find({ _id: { $in: teamIds } })
    .populate('captain', 'name email')
    .populate('players', 'name nickname role battingStyle bowlingStyle soldPrice');

  // Innings summaries (totals only)
  const inningsSummaries = (match.innings?.length ? match.innings : []).map((inn) => ({
    inningsNumber: inn.inningsNumber,
    battingTeam: inn.battingTeam,
    bowlingTeam: inn.bowlingTeam,
    totalRuns: inn.totalRuns,
    totalWickets: inn.totalWickets,
    totalBalls: inn.totalBalls,
    extras: inn.extras,
    target: inn.target,
    isCompleted: inn.isCompleted
  }));

  const legacyInningsSummaries = !inningsSummaries.length ? [
    {
      inningsNumber: 1,
      team: match.scorecard?.currentInnings === 'teamB' ? match.teamA : match.teamA,
      totalRuns: match.scorecard?.teamAScore?.runs ?? 0,
      totalWickets: match.scorecard?.teamAScore?.wickets ?? 0,
      totalBalls: ((match.scorecard?.teamAScore?.overs ?? 0) * 6) + (match.scorecard?.teamAScore?.balls ?? 0)
    },
    {
      inningsNumber: 2,
      team: match.scorecard?.currentInnings === 'teamB' ? match.teamB : match.teamB,
      totalRuns: match.scorecard?.teamBScore?.runs ?? 0,
      totalWickets: match.scorecard?.teamBScore?.wickets ?? 0,
      totalBalls: ((match.scorecard?.teamBScore?.overs ?? 0) * 6) + (match.scorecard?.teamBScore?.balls ?? 0),
      target: match.scorecard?.target ?? null
    }
  ] : [];

  res.json({
    success: true,
    data: {
      match,
      playerPool: match.playerPool,
      teams,
      auctionSummary,
      inningsSummaries: inningsSummaries.length ? inningsSummaries : legacyInningsSummaries,
      result: match.result || (match.winner ? { winner: match.winner } : null)
    }
  });
});

// @desc    Start innings (ball-by-ball scoring)
// @route   POST /api/matches/:id/innings/start
// @access  Private/Admin
export const startInnings = asyncHandler(async (req, res) => {
  const { battingTeamId, bowlingTeamId, strikerId, nonStrikerId, openingBowlerId } = req.body;
  if (!battingTeamId || !bowlingTeamId || !strikerId || !nonStrikerId || !openingBowlerId) {
    throw new AppError('battingTeamId, bowlingTeamId, strikerId, nonStrikerId, openingBowlerId are required', 400);
  }

  const match = await Match.findById(req.params.id);
  if (!match) throw new AppError('Match not found', 404);

  if (!['live', 'innings_break'].includes(match.status)) {
    throw new AppError("Match status must be 'live' or 'innings_break'", 400);
  }

  if (!Array.isArray(match.playerPool) || match.playerPool.length < 2) {
    throw new AppError('Match playerPool not set', 400);
  }

  // validate player ids in pool
  assertPlayersInPool(match, [strikerId, nonStrikerId, openingBowlerId]);

  const [battingTeam, bowlingTeam] = await Promise.all([
    Team.findById(battingTeamId).populate('players', '_id name nickname'),
    Team.findById(bowlingTeamId).populate('players', '_id name nickname')
  ]);
  if (!battingTeam || !bowlingTeam) throw new AppError('Batting or bowling team not found', 404);

  const battingSquad = new Set(getTeamSquadPlayerIds(battingTeam));
  const bowlingSquad = new Set(getTeamSquadPlayerIds(bowlingTeam));

  if (!battingSquad.has(String(strikerId)) || !battingSquad.has(String(nonStrikerId))) {
    throw new AppError('Striker and non-striker must be in batting team squad', 400);
  }
  if (!bowlingSquad.has(String(openingBowlerId))) {
    throw new AppError('Opening bowler must be in bowling team squad', 400);
  }

  // Ensure no active innings already running
  const hasActive = (match.innings || []).some(i => !i.isCompleted);
  if (hasActive) {
    throw new AppError('There is already an active innings', 400);
  }

  const inningsNumber = (match.innings?.length || 0) + 1;
  if (inningsNumber > 2) throw new AppError('Match already has 2 innings', 400);

  const striker = await Player.findById(strikerId).select('name nickname');
  const nonStriker = await Player.findById(nonStrikerId).select('name nickname');
  const openingBowler = await Player.findById(openingBowlerId).select('name nickname');
  if (!striker || !nonStriker || !openingBowler) throw new AppError('One or more players not found', 404);

  const innings = {
    inningsNumber,
    battingTeam: battingTeam._id,
    bowlingTeam: bowlingTeam._id,
    startingStrikerId: striker._id,
    startingNonStrikerId: nonStriker._id,
    startingBowlerId: openingBowler._id,
    target: inningsNumber === 2 ? ((match.innings?.[0]?.totalRuns || 0) + 1) : null,
    isCompleted: false,
    overs: [
      {
        overNumber: 1,
        bowlerId: openingBowler._id,
        bowlerName: openingBowler.nickname || openingBowler.name,
        deliveries: []
      }
    ]
  };

  match.innings.push(innings);
  await match.save();

  const live = await LiveMatchState.findOneAndUpdate(
    { matchId: match._id },
    {
      matchId: match._id,
      currentInnings: inningsNumber,
      strikerId: striker._id,
      strikerName: striker.nickname || striker.name,
      nonStrikerId: nonStriker._id,
      nonStrikerName: nonStriker.nickname || nonStriker.name,
      currentBowlerId: openingBowler._id,
      currentBowlerName: openingBowler.nickname || openingBowler.name,
      isFreehitNext: false,
      lastSixBalls: [],
      strikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
      nonStrikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
      currentBowlerStats: { overs: '0.0', runs: 0, wickets: 0, wides: 0, noBalls: 0 },
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  emitToMatch(match._id.toString(), 'innings_started', {
    inningsNumber,
    battingTeam: battingTeam._id,
    bowlingTeam: bowlingTeam._id,
    target: inningsNumber === 2 ? innings.target : null
  });

  const updatedMatch = await Match.findById(match._id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color');

  res.json({ success: true, data: updatedMatch, liveState: live });
});

// @desc    Log a delivery (ball-by-ball)
// @route   POST /api/matches/:id/delivery
// @access  Private/Admin
export const logDelivery = asyncHandler(async (req, res) => {
  const {
    runs = 0,
    extraType = 'none',
    extraRuns = 0,
    isWicket = false,
    wicketType,
    dismissedBatsmanId,
    fielderId,
    isBoundary = false,
    isSix = false,
    nextBatsmanId
  } = req.body;

  const match = await Match.findById(req.params.id);
  if (!match) throw new AppError('Match not found', 404);
  if (match.status !== 'live') throw new AppError("Match must be 'live'", 400);

  const live = await LiveMatchState.findOne({ matchId: match._id });
  if (!live) throw new AppError('LiveMatchState not found', 404);

  const { innings, over } = getActiveInningsAndOver(match);
  if (!innings || !over) throw new AppError('No active innings/over', 400);

  // validate striker/non/bowler exist
  if (!live.strikerId || !live.nonStrikerId || !live.currentBowlerId) {
    throw new AppError('LiveMatchState missing striker/nonStriker/bowler', 400);
  }

  // compute legality
  const isLegalDelivery = ['none', 'legBye', 'bye'].includes(extraType);
  const isFreehit = !!live.isFreehitNext;

  // noBall sets freehit for NEXT
  const nextIsFreehitNext = extraType === 'noBall';

  // freehit wicket rule
  let finalIsWicket = !!isWicket;
  let finalWicketType = wicketType || null;
  if (isFreehit && finalIsWicket && finalWicketType && finalWicketType !== 'runOut') {
    // ignore non-runout wickets on freehit
    finalIsWicket = false;
    finalWicketType = null;
  }

  if (finalIsWicket && !nextBatsmanId) {
    throw new AppError('nextBatsmanId is required when isWicket is true', 400);
  }

  // Denormalize names
  const [batsman, bowler, dismissed, nextBatter, fielder] = await Promise.all([
    Player.findById(live.strikerId).select('name nickname'),
    Player.findById(live.currentBowlerId).select('name nickname'),
    finalIsWicket ? Player.findById(dismissedBatsmanId || live.strikerId).select('name nickname') : null,
    finalIsWicket ? Player.findById(nextBatsmanId).select('name nickname') : null,
    fielderId ? Player.findById(fielderId).select('name nickname') : null
  ]);
  if (!batsman || !bowler) throw new AppError('Batsman or bowler not found', 404);
  if (finalIsWicket && (!dismissed || !nextBatter)) throw new AppError('Dismissed/next batsman not found', 404);

  // delivery numbering
  const rawDeliveryNumber = (over.deliveries?.length || 0) + 1;
  const legalCountSoFar = (over.deliveries || []).filter(d => d.isLegalDelivery).length;
  const deliveryNumber = isLegalDelivery ? (legalCountSoFar + 1) : legalCountSoFar;

  const totalRuns = Number(runs) + Number(extraRuns);

  const delivery = {
    deliveryNumber,
    rawDeliveryNumber,
    batsmanId: batsman._id,
    batsmanName: batsman.nickname || batsman.name,
    bowlerId: bowler._id,
    bowlerName: bowler.nickname || bowler.name,
    runs: Number(runs) || 0,
    extraType,
    extraRuns: Number(extraRuns) || 0,
    totalRuns,
    isWicket: finalIsWicket,
    wicketType: finalWicketType,
    dismissedBatsmanId: finalIsWicket ? dismissed._id : null,
    dismissedBatsmanName: finalIsWicket ? (dismissed.nickname || dismissed.name) : '',
    nextBatsmanId: finalIsWicket ? nextBatter._id : null,
    nextBatsmanName: finalIsWicket ? (nextBatter.nickname || nextBatter.name) : '',
    fielderId: fielder ? fielder._id : null,
    fielderName: fielder ? (fielder.nickname || fielder.name) : '',
    isBoundary: !!isBoundary,
    isSix: !!isSix,
    isFreehit,
    isLegalDelivery
  };

  // Update over
  over.deliveries.push(delivery);
  over.runsConceded += totalRuns;
  if (finalIsWicket && finalWicketType !== 'runOut') {
    over.wickets += 1;
  }
  const legalCountAfter = (over.deliveries || []).filter(d => d.isLegalDelivery).length;
  if (legalCountAfter >= 6) {
    over.isCompleted = true;
  }

  // Update innings
  innings.totalRuns += totalRuns;
  if (finalIsWicket) innings.totalWickets += 1;
  if (isLegalDelivery) innings.totalBalls += 1;
  if (extraType === 'wide') innings.extras.wides += Number(extraRuns) || 1;
  if (extraType === 'noBall') innings.extras.noBalls += Number(extraRuns) || 1;
  if (extraType === 'bye') innings.extras.byes += Number(extraRuns) || 0;
  if (extraType === 'legBye') innings.extras.legByes += Number(extraRuns) || 0;

  if (finalIsWicket) {
    innings.fallOfWickets.push({
      wicketNumber: innings.totalWickets,
      runs: innings.totalRuns,
      balls: innings.totalBalls,
      batsmanId: dismissed._id,
      batsmanName: dismissed.nickname || dismissed.name
    });
  }

  // Update LiveMatchState
  live.isFreehitNext = nextIsFreehitNext;

  // odd legal runs swap
  if (isLegalDelivery && (totalRuns % 2 !== 0)) {
    [live.strikerId, live.nonStrikerId] = [live.nonStrikerId, live.strikerId];
    [live.strikerName, live.nonStrikerName] = [live.nonStrikerName, live.strikerName];
  }

  // wicket brings new striker (per prompt)
  if (finalIsWicket) {
    live.strikerId = nextBatter._id;
    live.strikerName = nextBatter.nickname || nextBatter.name;
  }

  // end of over crossing
  if (over.isCompleted) {
    [live.strikerId, live.nonStrikerId] = [live.nonStrikerId, live.strikerId];
    [live.strikerName, live.nonStrikerName] = [live.nonStrikerName, live.strikerName];
  }

  // recompute stats snapshots
  live.strikerStats = live.strikerId ? computeBatterStats(innings, live.strikerId) : live.strikerStats;
  live.nonStrikerStats = live.nonStrikerId ? computeBatterStats(innings, live.nonStrikerId) : live.nonStrikerStats;
  live.currentBowlerStats = live.currentBowlerId ? computeBowlerStats(innings, live.currentBowlerId) : live.currentBowlerStats;

  // lastSixBalls prepend
  live.lastSixBalls = [symbolForDelivery(delivery), ...(live.lastSixBalls || [])].slice(0, 6);
  live.updatedAt = new Date();

  await match.save();
  await live.save();

  const inningsSummary = {
    totalRuns: innings.totalRuns,
    totalWickets: innings.totalWickets,
    totalBalls: innings.totalBalls,
    extras: innings.extras
  };

  // innings end conditions
  const battingTeam = await Team.findById(innings.battingTeam).populate('players', '_id');
  const squadSize = battingTeam?.players?.length || 0;
  const allOut = squadSize > 0 ? innings.totalWickets >= (squadSize - 1) : innings.totalWickets >= 10;
  const oversDone = innings.totalBalls >= (match.overs * 6);
  const chaseComplete = innings.inningsNumber === 2 && innings.target && innings.totalRuns >= innings.target;

  if (chaseComplete) {
    await endMatchInternal(match._id, innings.battingTeam);
  } else if (allOut || oversDone) {
    await endInningsInternal(match._id);
  }

  emitToMatch(match._id.toString(), 'delivery_logged', {
    delivery,
    inningsSummary,
    liveState: live
  });

  res.json({ success: true, data: { delivery, liveState: live, inningsSummary } });
});

// @desc    Undo last delivery
// @route   DELETE /api/matches/:id/delivery/last
// @access  Private/Admin
export const undoLastDelivery = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw new AppError('Match not found', 404);

  const { innings, over } = getActiveInningsAndOver(match);
  if (!innings || !over) throw new AppError('No active innings/over', 400);
  if (!over.deliveries?.length) throw new AppError('No deliveries to undo', 400);

  const d = over.deliveries.pop();

  // reverse over
  over.runsConceded = Math.max(0, (over.runsConceded || 0) - (d.totalRuns || 0));
  if (d.isWicket && d.wicketType !== 'runOut') {
    over.wickets = Math.max(0, (over.wickets || 0) - 1);
  }

  // reverse innings
  innings.totalRuns = Math.max(0, (innings.totalRuns || 0) - (d.totalRuns || 0));
  if (d.isWicket) innings.totalWickets = Math.max(0, (innings.totalWickets || 0) - 1);
  if (d.isLegalDelivery) innings.totalBalls = Math.max(0, (innings.totalBalls || 0) - 1);

  if (d.extraType === 'wide') innings.extras.wides = Math.max(0, innings.extras.wides - (d.extraRuns || 0));
  if (d.extraType === 'noBall') innings.extras.noBalls = Math.max(0, innings.extras.noBalls - (d.extraRuns || 0));
  if (d.extraType === 'bye') innings.extras.byes = Math.max(0, innings.extras.byes - (d.extraRuns || 0));
  if (d.extraType === 'legBye') innings.extras.legByes = Math.max(0, innings.extras.legByes - (d.extraRuns || 0));

  // reverse fow
  if (d.isWicket && innings.fallOfWickets?.length) {
    innings.fallOfWickets.pop();
  }

  // if over empty and not over 1 -> remove and reopen previous
  if ((over.deliveries?.length || 0) === 0 && over.overNumber > 1) {
    innings.overs.pop();
    const prev = innings.overs[innings.overs.length - 1];
    if (prev) prev.isCompleted = false;
  } else {
    over.isCompleted = false;
  }

  await match.save();
  const live = await recomputeLiveState(match._id);

  emitToMatch(match._id.toString(), 'delivery_undone', { liveState: live });
  res.json({ success: true, data: { liveState: live } });
});

// @desc    Set next bowler (start new over)
// @route   POST /api/matches/:id/bowler
// @access  Private/Admin
export const setNextBowler = asyncHandler(async (req, res) => {
  const { bowlerId } = req.body;
  if (!bowlerId) throw new AppError('bowlerId is required', 400);

  const match = await Match.findById(req.params.id);
  if (!match) throw new AppError('Match not found', 404);
  if (match.status !== 'live') throw new AppError("Match must be 'live'", 400);

  const { innings } = getActiveInningsAndOver(match);
  if (!innings) throw new AppError('No active innings', 400);

  const lastOver = innings.overs?.[innings.overs.length - 1];
  if (!lastOver) throw new AppError('No over found', 400);
  if (!lastOver.isCompleted) throw new AppError('Current over must be completed before selecting next bowler', 400);

  const bowlingTeam = await Team.findById(innings.bowlingTeam).populate('players', '_id');
  if (!bowlingTeam) throw new AppError('Bowling team not found', 404);
  const bowlingSquad = new Set(getTeamSquadPlayerIds(bowlingTeam));
  if (!bowlingSquad.has(String(bowlerId))) throw new AppError('Bowler must be in bowling team squad', 400);
  assertPlayersInPool(match, [bowlerId]);

  if (String(lastOver.bowlerId) === String(bowlerId)) {
    throw new AppError('Same bowler cannot bowl consecutive overs', 400);
  }

  const bowler = await Player.findById(bowlerId).select('name nickname');
  if (!bowler) throw new AppError('Bowler not found', 404);

  const newOverNumber = (lastOver.overNumber || 0) + 1;
  innings.overs.push({
    overNumber: newOverNumber,
    bowlerId: bowler._id,
    bowlerName: bowler.nickname || bowler.name,
    deliveries: []
  });

  await match.save();

  const live = await LiveMatchState.findOne({ matchId: match._id });
  if (live) {
    live.currentBowlerId = bowler._id;
    live.currentBowlerName = bowler.nickname || bowler.name;
    live.currentBowlerStats = { overs: '0.0', runs: 0, wickets: 0, wides: 0, noBalls: 0 };
    live.updatedAt = new Date();
    await live.save();
  }

  emitToMatch(match._id.toString(), 'new_over', { overNumber: newOverNumber, bowlerName: bowler.nickname || bowler.name });
  res.json({ success: true, data: match, liveState: live });
});

async function endInningsInternal(matchId) {
  const match = await Match.findById(matchId);
  if (!match) return;
  const { innings } = getActiveInningsAndOver(match);
  if (!innings) return;

  innings.isCompleted = true;
  await match.save();

  const innings1 = match.innings?.[0];
  const innings2 = match.innings?.[1];

  if (innings.inningsNumber === 1) {
    match.status = 'innings_break';
    await match.save();
    emitToMatch(match._id.toString(), 'innings_break', {
      innings1Summary: {
        totalRuns: innings1?.totalRuns || 0,
        totalWickets: innings1?.totalWickets || 0,
        totalBalls: innings1?.totalBalls || 0,
        extras: innings1?.extras || {}
      }
    });
    return;
  }

  // innings 2 ended -> complete match
  await endMatchInternal(match._id, null);
  // keep innings2 for completeness
  // eslint-disable-next-line no-unused-vars
  const _i2 = innings2;
}

// @desc    End innings (manual)
// @route   POST /api/matches/:id/innings/end
// @access  Private/Admin
export const endInnings = asyncHandler(async (req, res) => {
  await endInningsInternal(req.params.id);
  const match = await Match.findById(req.params.id);
  res.json({ success: true, data: match });
});

async function endMatchInternal(matchId, chasingTeamIdOrNull) {
  const match = await Match.findById(matchId);
  if (!match) return;

  match.status = 'completed';

  // Determine result from innings totals when available
  const i1 = match.innings?.[0];
  const i2 = match.innings?.[1];
  if (i1 && i2) {
    const team1Runs = i1.totalRuns || 0;
    const team2Runs = i2.totalRuns || 0;

    if (team2Runs > team1Runs) {
      match.result.winner = chasingTeamIdOrNull || i2.battingTeam;
      match.result.marginType = 'wickets';
      // wickets remaining (approx): squad size - 1 - wickets lost
      const chaseTeam = await Team.findById(i2.battingTeam).populate('players', '_id');
      const squad = chaseTeam?.players?.length || 11;
      match.result.margin = Math.max(0, (squad - 1) - (i2.totalWickets || 0));
    } else if (team1Runs > team2Runs) {
      match.result.winner = i1.battingTeam;
      match.result.marginType = 'runs';
      match.result.margin = team1Runs - team2Runs;
    } else {
      match.result.winner = null;
      match.result.marginType = 'tie';
      match.result.margin = 0;
    }
  } else {
    match.result.winner = match.winner || null;
    match.result.marginType = match.result.marginType || 'no result';
  }

  await match.save();
  emitToMatch(match._id.toString(), 'match_completed', { result: match.result });

  try {
    await aggregateCareerStats(match._id);
  } catch (error) {
    console.error('Career stats aggregation failed:', error);
  }
}

// @desc    Complete match (manual)
// @route   POST /api/matches/:id/complete
// @access  Private/Admin
export const completeMatch = asyncHandler(async (req, res) => {
  await endMatchInternal(req.params.id, null);
  const match = await Match.findById(req.params.id);
  res.json({ success: true, data: match });
});

// @desc    Get live state (public)
// @route   GET /api/matches/:id/live
// @access  Public
export const getLiveState = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color');
  if (!match) throw new AppError('Match not found', 404);

  const live = await LiveMatchState.findOne({ matchId: match._id })
    .populate('strikerId', 'name nickname')
    .populate('nonStrikerId', 'name nickname')
    .populate('currentBowlerId', 'name nickname');

  const { innings } = getActiveInningsAndOver(match);
  const inningsSummary = innings ? {
    inningsNumber: innings.inningsNumber,
    totalRuns: innings.totalRuns,
    totalWickets: innings.totalWickets,
    totalBalls: innings.totalBalls,
    extras: innings.extras,
    target: innings.target
  } : null;

  res.json({
    success: true,
    data: {
      match: {
        _id: match._id,
        status: match.status,
        overs: match.overs,
        result: match.result
      },
      liveState: live,
      inningsSummary
    }
  });
});

// @desc    Get full scorecard (public)
// @route   GET /api/matches/:id/scorecard
// @access  Public
export const getScorecard = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('teamA', 'name logo color')
    .populate('teamB', 'name logo color')
    .populate('result.winner', 'name logo color');
  if (!match) throw new AppError('Match not found', 404);

  const inningsCards = (match.innings || []).map((inn) => {
    const battingMap = new Map(); // playerId -> stats
    const bowlingMap = new Map(); // bowlerId -> stats

    const addBatter = (pid, name) => {
      const key = String(pid);
      if (!battingMap.has(key)) {
        battingMap.set(key, { batsmanId: pid, batsmanName: name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissalInfo: '' });
      }
      return battingMap.get(key);
    };

    const addBowler = (pid, name) => {
      const key = String(pid);
      if (!bowlingMap.has(key)) {
        bowlingMap.set(key, { bowlerId: pid, bowlerName: name, legalBalls: 0, maidens: 0, runs: 0, wickets: 0 });
      }
      return bowlingMap.get(key);
    };

    for (const over of inn.overs || []) {
      let overRuns = 0;
      for (const d of over.deliveries || []) {
        const bat = addBatter(d.batsmanId, d.batsmanName);
        bat.runs += d.runs || 0;
        if (d.isLegalDelivery) bat.balls += 1;
        if (d.isBoundary) bat.fours += 1;
        if (d.isSix) bat.sixes += 1;

        const bowl = addBowler(d.bowlerId, d.bowlerName);
        bowl.runs += d.totalRuns || 0;
        if (d.isLegalDelivery) bowl.legalBalls += 1;
        if (d.isWicket && d.wicketType && d.wicketType !== 'runOut') bowl.wickets += 1;

        overRuns += d.totalRuns || 0;

        if (d.isWicket && d.dismissedBatsmanId) {
          const outBat = addBatter(d.dismissedBatsmanId, d.dismissedBatsmanName || '');
          outBat.isOut = true;
          outBat.dismissalInfo = d.wicketType ? `${d.wicketType}${d.fielderName ? ` (${d.fielderName})` : ''}` : 'out';
        }
      }
      // maiden if completed over and 0 runs conceded
      if (over.isCompleted && overRuns === 0) {
        const bowl = addBowler(over.bowlerId, over.bowlerName);
        bowl.maidens += 1;
      }
    }

    const battingCard = Array.from(battingMap.values()).map((b) => ({
      ...b,
      strikeRate: b.balls > 0 ? Number(((b.runs / b.balls) * 100).toFixed(1)) : 0
    }));

    const bowlingCard = Array.from(bowlingMap.values()).map((b) => {
      const oversStr = `${Math.floor(b.legalBalls / 6)}.${b.legalBalls % 6}`;
      const economy = b.legalBalls > 0 ? Number(((b.runs / (b.legalBalls / 6))).toFixed(1)) : 0;
      return {
        bowlerId: b.bowlerId,
        bowlerName: b.bowlerName,
        overs: oversStr,
        maidens: b.maidens,
        runs: b.runs,
        wickets: b.wickets,
        economy
      };
    });

    return {
      inningsNumber: inn.inningsNumber,
      battingTeam: inn.battingTeam,
      bowlingTeam: inn.bowlingTeam,
      totals: {
        runs: inn.totalRuns,
        wickets: inn.totalWickets,
        balls: inn.totalBalls
      },
      extras: inn.extras,
      fallOfWickets: inn.fallOfWickets,
      battingCard,
      bowlingCard,
      target: inn.target
    };
  });

  res.json({
    success: true,
    data: {
      match: {
        _id: match._id,
        status: match.status,
        overs: match.overs,
        result: match.result
      },
      innings: inningsCards
    }
  });
});
