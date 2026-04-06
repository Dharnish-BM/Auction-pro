import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';

const emptyCareerStats = () => ({
  matchesPlayed: 0,
  totalRuns: 0,
  totalBallsFaced: 0,
  highScore: 0,
  fifties: 0,
  hundreds: 0,
  fours: 0,
  sixes: 0,
  totalWickets: 0,
  totalBallsBowled: 0,
  totalRunsConceded: 0,
  catches: 0,
  runOuts: 0,
  stumpings: 0,
  bestBowlingWickets: 0,
  bestBowlingRuns: 999
});

const ensurePlayerStats = (map, playerId) => {
  const key = String(playerId);
  if (!map.has(key)) {
    map.set(key, {
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      notOut: true,
      wickets: 0,
      ballsBowled: 0,
      runsConceded: 0,
      wides: 0,
      noBalls: 0,
      catches: 0,
      runOuts: 0,
      stumpings: 0
    });
  }
  return map.get(key);
};

export const aggregateCareerStats = async (matchId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new AppError('Match not found', 404);

  const statsMap = new Map();

  for (const inn of match.innings || []) {
    for (const over of inn.overs || []) {
      for (const d of over.deliveries || []) {
        // Batting (batsmanId)
        if (d.batsmanId) {
          const s = ensurePlayerStats(statsMap, d.batsmanId);
          s.runs += d.runs || 0;
          if (d.isLegalDelivery) s.ballsFaced += 1;
          if (d.isBoundary) s.fours += 1;
          if (d.isSix) s.sixes += 1;
        }

        // Mark out for dismissed batsman
        if (d.isWicket && d.dismissedBatsmanId) {
          const s = ensurePlayerStats(statsMap, d.dismissedBatsmanId);
          s.notOut = false;
        }

        // Bowling (bowlerId)
        if (d.bowlerId) {
          const s = ensurePlayerStats(statsMap, d.bowlerId);
          if (d.isLegalDelivery) s.ballsBowled += 1;

          if (d.extraType === 'wide') s.wides += 1;
          if (d.extraType === 'noBall') s.noBalls += 1;

          // Runs conceded: charged to bowler except byes/leg byes
          const isByeOrLegBye = d.extraType === 'bye' || d.extraType === 'legBye';
          if (!isByeOrLegBye) {
            s.runsConceded += (d.runs || 0) + (d.extraRuns || 0);
          }

          if (d.isWicket && d.wicketType && d.wicketType !== 'runOut') {
            s.wickets += 1;
          }
        }

        // Fielding (fielderId)
        if (d.fielderId && d.wicketType) {
          const s = ensurePlayerStats(statsMap, d.fielderId);
          if (d.wicketType === 'caught') s.catches += 1;
          if (d.wicketType === 'stumped') s.stumpings += 1;
          if (d.wicketType === 'runOut') s.runOuts += 1;
        }
      }
    }
  }

  // Persist per-player updates
  const updates = [];
  for (const [playerId, s] of statsMap.entries()) {
    const matchHistoryEntry = {
      matchId: match._id,
      runs: s.runs,
      ballsFaced: s.ballsFaced,
      wickets: s.wickets,
      runsConceded: s.runsConceded,
      ballsBowled: s.ballsBowled,
      catches: s.catches,
      notOut: s.notOut,
      date: match.date
    };

    updates.push((async () => {
      const player = await Player.findById(playerId).select('careerStats.bestBowlingWickets careerStats.bestBowlingRuns');
      if (!player) return;

      const inc = {
        'careerStats.matchesPlayed': 1,
        'careerStats.totalRuns': s.runs,
        'careerStats.totalBallsFaced': s.ballsFaced,
        'careerStats.fours': s.fours,
        'careerStats.sixes': s.sixes,
        'careerStats.totalWickets': s.wickets,
        'careerStats.totalBallsBowled': s.ballsBowled,
        'careerStats.totalRunsConceded': s.runsConceded,
        'careerStats.catches': s.catches,
        'careerStats.runOuts': s.runOuts,
        'careerStats.stumpings': s.stumpings
      };

      if (s.runs >= 50 && s.runs < 100) inc['careerStats.fifties'] = 1;
      if (s.runs >= 100) inc['careerStats.hundreds'] = 1;

      const update = {
        $inc: inc,
        $max: { 'careerStats.highScore': s.runs },
        $push: { matchHistory: matchHistoryEntry }
      };

      // Best bowling update logic
      const currentBestW = player.careerStats?.bestBowlingWickets ?? 0;
      const currentBestR = player.careerStats?.bestBowlingRuns ?? 999;
      const shouldUpdateBest =
        s.wickets > currentBestW ||
        (s.wickets === currentBestW && s.wickets > 0 && s.runsConceded < currentBestR);

      if (shouldUpdateBest) {
        update.$set = {
          ...(update.$set || {}),
          'careerStats.bestBowlingWickets': s.wickets,
          'careerStats.bestBowlingRuns': s.runsConceded
        };
      }

      await Player.findByIdAndUpdate(playerId, update, { new: false });
    })());
  }

  await Promise.all(updates);
  return { success: true, playersUpdated: statsMap.size };
};

// @desc    Recalculate career stats for all players
// @route   POST /api/admin/recalc-stats
// @access  Private/Admin
export const recalculateAllStats = asyncHandler(async (req, res) => {
  // reset all players
  await Player.updateMany(
    {},
    {
      $set: {
        careerStats: emptyCareerStats(),
        matchHistory: []
      }
    }
  );

  const matches = await Match.find({ status: 'completed' }).sort({ date: 1, createdAt: 1 }).select('_id');

  for (const m of matches) {
    await aggregateCareerStats(m._id);
  }

  res.json({
    success: true,
    message: 'Career stats recalculated successfully',
    matchesProcessed: matches.length
  });
});

