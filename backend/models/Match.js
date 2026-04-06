import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
  deliveryNumber: { type: Number, required: true }, // legal deliveries only (1-6)
  rawDeliveryNumber: { type: Number, required: true }, // includes wides/no-balls
  batsmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  batsmanName: { type: String, required: true },
  bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  bowlerName: { type: String, required: true },
  runs: { type: Number, default: 0 }, // off bat
  extraType: {
    type: String,
    enum: ['none', 'wide', 'noBall', 'legBye', 'bye', 'penalty'],
    default: 'none'
  },
  extraRuns: { type: Number, default: 0 },
  totalRuns: { type: Number, default: 0 }, // runs + extraRuns
  isWicket: { type: Boolean, default: false },
  wicketType: {
    type: String,
    enum: ['bowled', 'caught', 'runOut', 'stumped', 'lbw', 'hitWicket', 'retiredHurt', 'retiredOut', 'obstructingField'],
    default: null
  },
  dismissedBatsmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  dismissedBatsmanName: { type: String, default: '' },
  fielderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  fielderName: { type: String, default: '' },
  isBoundary: { type: Boolean, default: false },
  isSix: { type: Boolean, default: false },
  isFreehit: { type: Boolean, default: false },
  isLegalDelivery: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const overSchema = new mongoose.Schema({
  overNumber: { type: Number, required: true }, // 1-indexed
  bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  bowlerName: { type: String, required: true },
  runsConceded: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  deliveries: [deliverySchema]
}, { _id: false });

const inningsFallOfWicketSchema = new mongoose.Schema({
  wicketNumber: { type: Number, required: true },
  runs: { type: Number, required: true },
  balls: { type: Number, required: true },
  batsmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  batsmanName: { type: String, required: true }
}, { _id: false });

const inningsSchema = new mongoose.Schema({
  inningsNumber: { type: Number, enum: [1, 2], required: true },
  battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  totalBalls: { type: Number, default: 0 }, // legal deliveries only
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    penalties: { type: Number, default: 0 }
  },
  target: { type: Number, default: null }, // only set for 2nd innings
  isCompleted: { type: Boolean, default: false },
  fallOfWickets: [inningsFallOfWicketSchema],
  overs: [overSchema]
}, { _id: false });

const batsmanSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  runs: {
    type: Number,
    default: 0
  },
  balls: {
    type: Number,
    default: 0
  },
  fours: {
    type: Number,
    default: 0
  },
  sixes: {
    type: Number,
    default: 0
  },
  isOut: {
    type: Boolean,
    default: false
  },
  outType: {
    type: String,
    enum: ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', ''],
    default: ''
  },
  isOnStrike: {
    type: Boolean,
    default: false
  },
  isNonStriker: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const bowlerSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  overs: {
    type: Number,
    default: 0
  },
  balls: {
    type: Number,
    default: 0
  },
  maidens: {
    type: Number,
    default: 0
  },
  runs: {
    type: Number,
    default: 0
  },
  wickets: {
    type: Number,
    default: 0
  },
  wides: {
    type: Number,
    default: 0
  },
  noBalls: {
    type: Number,
    default: 0
  }
}, { _id: false });

const fallOfWicketSchema = new mongoose.Schema({
  wicket: {
    type: Number,
    required: true
  },
  runs: {
    type: Number,
    required: true
  },
  over: {
    type: Number,
    required: true
  },
  batsman: {
    type: String,
    required: true
  }
}, { _id: false });

const scorecardSchema = new mongoose.Schema({
  teamAScore: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 }
  },
  teamBScore: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 }
  },
  currentInnings: {
    type: String,
    enum: ['teamA', 'teamB'],
    default: 'teamA'
  },
  currentBatsmen: [batsmanSchema],
  currentBowler: {
    type: bowlerSchema,
    default: null
  },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  fallOfWickets: [fallOfWicketSchema],
  target: {
    type: Number,
    default: null
  }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Please specify Team A']
  },
  teamAName: {
    type: String,
    required: true
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Please specify Team B']
  },
  teamBName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Please specify match date']
  },
  time: {
    type: String,
    required: [true, 'Please specify match time']
  },
  location: {
    type: String,
    required: [true, 'Please specify match location'],
    trim: true
  },
  venue: {
    type: String,
    default: ''
  },
  overs: {
    type: Number,
    required: true,
    default: 10
  },
  format: {
    type: String,
    default: 'Custom'
  },
  playerPool: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  status: {
    type: String,
    // Keep legacy values to avoid breaking existing workflows.
    enum: ['setup', 'auction', 'auction_done', 'live', 'innings_break', 'completed', 'upcoming', 'abandoned'],
    default: 'upcoming'
  },
  tossWinner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  battingFirst: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  tossDecision: {
    type: String,
    enum: ['bat', 'bowl', ''],
    default: ''
  },
  result: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    margin: { type: Number, default: 0 },
    marginType: { type: String, enum: ['runs', 'wickets', 'tie', 'no result', ''], default: '' }
  },
  innings: {
    type: [inningsSchema],
    default: []
  },
  scorecard: {
    type: scorecardSchema,
    default: () => ({})
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  manOfTheMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  oversPerInnings: {
    type: Number,
    default: 10
  }
}, {
  timestamps: true
});

// Calculate derived stats
matchSchema.methods.calculateRunRate = function(team) {
  const score = team === 'A' ? this.scorecard.teamAScore : this.scorecard.teamBScore;
  const totalBalls = score.overs * 6 + score.balls;
  if (totalBalls === 0) return 0;
  return ((score.runs / totalBalls) * 6).toFixed(2);
};

matchSchema.methods.calculateRequiredRunRate = function() {
  if (this.status !== 'live' || this.scorecard.currentInnings !== 'teamB') return null;
  const remainingRuns = this.scorecard.target - this.scorecard.teamBScore.runs;
  const totalBalls = this.oversPerInnings * 6;
  const ballsBowled = this.scorecard.teamBScore.overs * 6 + this.scorecard.teamBScore.balls;
  const remainingBalls = totalBalls - ballsBowled;
  if (remainingBalls <= 0) return 0;
  return ((remainingRuns / remainingBalls) * 6).toFixed(2);
};

const Match = mongoose.model('Match', matchSchema);

export default Match;
