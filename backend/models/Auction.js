import mongoose from 'mongoose';

const bidHistorySchema = new mongoose.Schema({
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  bidderName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Bid amount cannot be negative']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const bidSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  captainId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: [0, 'Bid amount cannot be negative'] },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const auctionSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: [true, 'Please specify the match for this auction']
  },
  playerPool: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  queue: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  unsoldPool: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  currentPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  bids: [bidSchema],
  config: {
    teams: { type: Number, default: 0 },
    budgetPerTeam: { type: Number, default: 0 },
    basePrice: { type: Number, default: 0 },
    bidIncrement: { type: Number, default: 1000 },
    timerSeconds: { type: Number, default: 15 }
  },
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  playerName: {
    type: String,
    default: ''
  },
  basePrice: {
    type: Number,
    default: 0
  },
  highestBid: {
    type: Number,
    default: 0
  },
  highestBidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  highestBidderName: {
    type: String,
    default: ''
  },
  bidHistory: [bidHistorySchema],
  status: {
    type: String,
    // Keep legacy values to avoid breaking existing history reads.
    enum: ['pending', 'active', 'paused', 'round2', 'closed', 'completed', 'unsold'],
    default: 'pending'
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 30 // seconds
  },
  timeRemaining: {
    type: Number,
    default: 30
  },
  soldPrice: {
    type: Number,
    default: null
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  soldToName: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for querying active auctions
auctionSchema.index({ status: 1 });
auctionSchema.index({ playerId: 1 });
auctionSchema.index({ matchId: 1 });

const Auction = mongoose.model('Auction', auctionSchema);

export default Auction;
