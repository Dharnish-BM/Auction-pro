import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Match from '../models/Match.js';
import Team from '../models/Team.js';

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
  const { teamA, teamB, date, time, location, oversPerInnings } = req.body;

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
    oversPerInnings: oversPerInnings || 10,
    status: 'upcoming'
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
    status: 'upcoming',
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
