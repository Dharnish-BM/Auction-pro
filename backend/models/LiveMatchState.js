import mongoose from 'mongoose';

const liveMatchStateSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    unique: true,
    required: true
  },
  currentInnings: {
    type: Number,
    enum: [1, 2],
    default: 1
  },
  strikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  strikerName: { type: String, default: '' },
  nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  nonStrikerName: { type: String, default: '' },
  currentBowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  currentBowlerName: { type: String, default: '' },
  isFreehitNext: { type: Boolean, default: false },
  lastSixBalls: {
    type: [String],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length <= 6,
      message: 'lastSixBalls cannot exceed 6 entries'
    },
    default: []
  },
  strikerStats: {
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 }
  },
  nonStrikerStats: {
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 }
  },
  currentBowlerStats: {
    overs: { type: String, default: '0.0' },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 }
  },
  updatedAt: { type: Date, default: Date.now }
});

liveMatchStateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const LiveMatchState = mongoose.model('LiveMatchState', liveMatchStateSchema);

export default LiveMatchState;

