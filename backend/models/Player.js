import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide player name'],
    trim: true,
    maxlength: [50, 'Player name cannot be more than 50 characters']
  },
  nickname: {
    type: String,
    required: [true, 'Please provide player nickname'],
    trim: true,
    maxlength: [30, 'Nickname cannot be more than 30 characters']
  },
  role: {
    type: String,
    // Keep legacy values to avoid breaking existing data.
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'All-rounder', 'Wicket-Keeper', 'Wicket-keeper'],
    required: [true, 'Please specify player role']
  },
  basePrice: {
    type: Number,
    required: [true, 'Please provide base price'],
    min: [0, 'Base price cannot be negative']
  },
  soldPrice: {
    type: Number,
    default: null,
    min: [0, 'Sold price cannot be negative']
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  battingStyle: {
    type: String,
    // Keep legacy values to avoid breaking existing data.
    enum: ['Right-hand bat', 'Left-hand bat', 'Right-handed', 'Left-handed', ''],
    default: ''
  },
  bowlingStyle: {
    type: String,
    // Keep legacy values to avoid breaking existing data.
    enum: [
      'Right-arm fast',
      'Right-arm medium',
      'Left-arm fast',
      'Left-arm medium',
      'Right-arm off-spin',
      'Left-arm spin',
      'Right-arm leg-spin',
      'Right-arm Fast',
      'Right-arm Medium',
      'Right-arm Off-spin',
      'Right-arm Leg-spin',
      'Left-arm Fast',
      'Left-arm Medium',
      'Left-arm Spin',
      ''
    ],
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  auctionHistory: [
    new mongoose.Schema(
      {
        matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
        teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
        soldFor: { type: Number, default: 0, min: [0, 'Sold amount cannot be negative'] },
        unsold: { type: Boolean, default: false }
      },
      { _id: false }
    )
  ],
  careerStats: {
    matchesPlayed: { type: Number, default: 0 },
    totalRuns: { type: Number, default: 0 },
    totalBallsFaced: { type: Number, default: 0 },
    highScore: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalBallsBowled: { type: Number, default: 0 },
    totalRunsConceded: { type: Number, default: 0 },
    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
    bestBowlingWickets: { type: Number, default: 0 },
    bestBowlingRuns: { type: Number, default: 999 }
  },
  matchHistory: [
    new mongoose.Schema(
      {
        matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
        runs: { type: Number, default: 0 },
        ballsFaced: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        runsConceded: { type: Number, default: 0 },
        ballsBowled: { type: Number, default: 0 },
        catches: { type: Number, default: 0 },
        notOut: { type: Boolean, default: false },
        date: { type: Date, default: Date.now }
      },
      { _id: false }
    )
  ],
  stats: {
    matches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    bestBowling: { type: String, default: '' },
    catches: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 }
  },
  isSold: {
    type: Boolean,
    default: false
  },
  auctionStatus: {
    type: String,
    enum: ['pending', 'active', 'sold', 'unsold'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const Player = mongoose.model('Player', playerSchema);

export default Player;
