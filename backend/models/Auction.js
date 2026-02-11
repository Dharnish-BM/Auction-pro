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

const auctionSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: [true, 'Please specify the player for auction']
  },
  playerName: {
    type: String,
    required: true
  },
  basePrice: {
    type: Number,
    required: true
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
    enum: ['pending', 'active', 'completed', 'unsold'],
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

const Auction = mongoose.model('Auction', auctionSchema);

export default Auction;
