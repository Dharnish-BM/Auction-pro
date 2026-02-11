import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide player name'],
    trim: true,
    maxlength: [50, 'Player name cannot be more than 50 characters']
  },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'],
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
    enum: ['Right-handed', 'Left-handed', ''],
    default: ''
  },
  bowlingStyle: {
    type: String,
    enum: ['Right-arm Fast', 'Right-arm Medium', 'Right-arm Off-spin', 'Right-arm Leg-spin', 'Left-arm Fast', 'Left-arm Medium', 'Left-arm Spin', ''],
    default: ''
  },
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
