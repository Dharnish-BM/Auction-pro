import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a team name'],
    trim: true,
    unique: true,
    maxlength: [50, 'Team name cannot be more than 50 characters']
  },
  logo: {
    type: String,
    default: ''
  },
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please assign a captain to the team']
  },
  totalBudget: {
    type: Number,
    required: [true, 'Please provide total budget'],
    default: 100000,
    min: [0, 'Budget cannot be negative']
  },
  remainingBudget: {
    type: Number,
    default: function() {
      return this.totalBudget;
    },
    min: [0, 'Remaining budget cannot be negative']
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  color: {
    type: String,
    default: '#00ff88'
  },
  matchesPlayed: {
    type: Number,
    default: 0
  },
  matchesWon: {
    type: Number,
    default: 0
  },
  matchesLost: {
    type: Number,
    default: 0
  },
  netRunRate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Update remaining budget when players are added
 teamSchema.methods.updateRemainingBudget = function(amount) {
  this.remainingBudget -= amount;
  return this.save();
};

const Team = mongoose.model('Team', teamSchema);

export default Team;
