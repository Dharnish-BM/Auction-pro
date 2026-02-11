import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Auction from '../models/Auction.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import User from '../models/User.js';

dotenv.config();

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@turauction.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    name: 'Captain One',
    email: 'captain1@turauction.com',
    password: 'captain123',
    role: 'captain'
  },
  {
    name: 'Captain Two',
    email: 'captain2@turauction.com',
    password: 'captain123',
    role: 'captain'
  },
  {
    name: 'Captain Three',
    email: 'captain3@turauction.com',
    password: 'captain123',
    role: 'captain'
  },
  {
    name: 'Captain Four',
    email: 'captain4@turauction.com',
    password: 'captain123',
    role: 'captain'
  },
  {
    name: 'Viewer User',
    email: 'viewer@turauction.com',
    password: 'viewer123',
    role: 'viewer'
  }
];

const players = [
  // Batsmen
  {
    name: 'Virat Kohli',
    role: 'Batsman',
    basePrice: 20000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Medium',
    stats: { matches: 120, runs: 4500, average: 52.3, strikeRate: 138.5, highestScore: 113 }
  },
  {
    name: 'Rohit Sharma',
    role: 'Batsman',
    basePrice: 18000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Off-spin',
    stats: { matches: 110, runs: 3800, average: 48.2, strikeRate: 142.1, highestScore: 118 }
  },
  {
    name: 'KL Rahul',
    role: 'Batsman',
    basePrice: 15000,
    battingStyle: 'Right-handed',
    bowlingStyle: '',
    stats: { matches: 85, runs: 2900, average: 45.8, strikeRate: 135.2, highestScore: 132 }
  },
  {
    name: 'Shikhar Dhawan',
    role: 'Batsman',
    basePrice: 12000,
    battingStyle: 'Left-handed',
    bowlingStyle: 'Right-arm Off-spin',
    stats: { matches: 95, runs: 3200, average: 42.1, strikeRate: 128.6, highestScore: 106 }
  },
  {
    name: 'Faf du Plessis',
    role: 'Batsman',
    basePrice: 14000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Leg-spin',
    stats: { matches: 75, runs: 2400, average: 44.2, strikeRate: 131.4, highestScore: 96 }
  },
  // Bowlers
  {
    name: 'Jasprit Bumrah',
    role: 'Bowler',
    basePrice: 22000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Fast',
    stats: { matches: 90, wickets: 115, economy: 6.8, bestBowling: '5/10' }
  },
  {
    name: 'Rashid Khan',
    role: 'Bowler',
    basePrice: 19000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Leg-spin',
    stats: { matches: 80, wickets: 105, economy: 6.2, bestBowling: '4/11' }
  },
  {
    name: 'Yuzvendra Chahal',
    role: 'Bowler',
    basePrice: 13000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Leg-spin',
    stats: { matches: 85, wickets: 95, economy: 7.1, bestBowling: '4/25' }
  },
  {
    name: 'Bhuvneshwar Kumar',
    role: 'Bowler',
    basePrice: 11000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Medium',
    stats: { matches: 95, wickets: 88, economy: 7.3, bestBowling: '4/14' }
  },
  {
    name: 'Trent Boult',
    role: 'Bowler',
    basePrice: 16000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Left-arm Fast',
    stats: { matches: 70, wickets: 92, economy: 7.0, bestBowling: '4/18' }
  },
  // All-Rounders
  {
    name: 'Hardik Pandya',
    role: 'All-Rounder',
    basePrice: 25000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Fast',
    stats: { matches: 100, runs: 2100, wickets: 65, average: 32.5, strikeRate: 156.8, economy: 8.2 }
  },
  {
    name: 'Ben Stokes',
    role: 'All-Rounder',
    basePrice: 23000,
    battingStyle: 'Left-handed',
    bowlingStyle: 'Right-arm Fast',
    stats: { matches: 65, runs: 1800, wickets: 45, average: 35.2, strikeRate: 145.3, economy: 7.8 }
  },
  {
    name: 'Ravindra Jadeja',
    role: 'All-Rounder',
    basePrice: 17000,
    battingStyle: 'Left-handed',
    bowlingStyle: 'Left-arm Spin',
    stats: { matches: 105, runs: 1600, wickets: 75, average: 28.4, strikeRate: 128.9, economy: 6.9 }
  },
  {
    name: 'Andre Russell',
    role: 'All-Rounder',
    basePrice: 21000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Fast',
    stats: { matches: 70, runs: 1500, wickets: 55, average: 30.1, strikeRate: 178.5, economy: 8.5 }
  },
  {
    name: 'Sunil Narine',
    role: 'All-Rounder',
    basePrice: 14000,
    battingStyle: 'Left-handed',
    bowlingStyle: 'Right-arm Off-spin',
    stats: { matches: 95, runs: 800, wickets: 105, average: 18.5, strikeRate: 165.2, economy: 6.1 }
  },
  // Wicket-Keepers
  {
    name: 'MS Dhoni',
    role: 'Wicket-Keeper',
    basePrice: 24000,
    battingStyle: 'Right-handed',
    bowlingStyle: 'Right-arm Medium',
    stats: { matches: 130, runs: 2800, average: 40.5, strikeRate: 138.2, highestScore: 84, catches: 85, stumpings: 35 }
  },
  {
    name: 'Rishabh Pant',
    role: 'Wicket-Keeper',
    basePrice: 16000,
    battingStyle: 'Left-handed',
    bowlingStyle: '',
    stats: { matches: 75, runs: 2200, average: 38.6, strikeRate: 152.3, highestScore: 128, catches: 65, stumpings: 22 }
  },
  {
    name: 'Jos Buttler',
    role: 'Wicket-Keeper',
    basePrice: 18000,
    battingStyle: 'Right-handed',
    bowlingStyle: '',
    stats: { matches: 70, runs: 2400, average: 42.1, strikeRate: 148.7, highestScore: 124, catches: 58, stumpings: 18 }
  },
  {
    name: 'Quinton de Kock',
    role: 'Wicket-Keeper',
    basePrice: 15000,
    battingStyle: 'Left-handed',
    bowlingStyle: '',
    stats: { matches: 80, runs: 2600, average: 39.4, strikeRate: 141.2, highestScore: 108, catches: 72, stumpings: 15 }
  },
  {
    name: 'Sanju Samson',
    role: 'Wicket-Keeper',
    basePrice: 12000,
    battingStyle: 'Right-handed',
    bowlingStyle: '',
    stats: { matches: 90, runs: 2300, average: 34.8, strikeRate: 139.5, highestScore: 119, catches: 68, stumpings: 20 }
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Match.deleteMany({});
    await Auction.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create users
    console.log('👤 Creating users...');
    const createdUsers = [];
    for (const userData of users) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`   ✓ ${user.name} (${user.role})`);
    }
    console.log('');

    // Get captains
    const captains = createdUsers.filter(u => u.role === 'captain');

    // Create teams
    console.log('🏏 Creating teams...');
    const teamsData = [
      {
        name: 'Mumbai Strikers',
        logo: 'https://ui-avatars.com/api/?name=Mumbai+Strikers&background=00ff88&color=fff',
        captain: captains[0]._id,
        totalBudget: 100000,
        remainingBudget: 100000,
        color: '#00ff88'
      },
      {
        name: 'Delhi Dynamos',
        logo: 'https://ui-avatars.com/api/?name=Delhi+Dynamos&background=ff0044&color=fff',
        captain: captains[1]._id,
        totalBudget: 100000,
        remainingBudget: 100000,
        color: '#ff0044'
      },
      {
        name: 'Chennai Super Kings',
        logo: 'https://ui-avatars.com/api/?name=Chennai+Super+Kings&background=ffd700&color=000',
        captain: captains[2]._id,
        totalBudget: 100000,
        remainingBudget: 100000,
        color: '#ffd700'
      },
      {
        name: 'Bangalore Royals',
        logo: 'https://ui-avatars.com/api/?name=Bangalore+Royals&background=ff6600&color=fff',
        captain: captains[3]._id,
        totalBudget: 100000,
        remainingBudget: 100000,
        color: '#ff6600'
      }
    ];

    const createdTeams = [];
    for (let i = 0; i < teamsData.length; i++) {
      const team = await Team.create(teamsData[i]);
      createdTeams.push(team);
      
      // Update captain's teamId
      captains[i].teamId = team._id;
      await captains[i].save();
      
      console.log(`   ✓ ${team.name}`);
    }
    console.log('');

    // Create players
    console.log('🏃 Creating players...');
    const createdPlayers = [];
    for (const playerData of players) {
      const player = await Player.create(playerData);
      createdPlayers.push(player);
      console.log(`   ✓ ${player.name} (${player.role})`);
    }
    console.log('');

    // Create sample matches
    console.log('📅 Creating sample matches...');
    const today = new Date();
    const matchesData = [
      {
        teamA: createdTeams[0]._id,
        teamAName: createdTeams[0].name,
        teamB: createdTeams[1]._id,
        teamBName: createdTeams[1].name,
        date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        time: '18:00',
        location: 'Wankhede Stadium, Mumbai',
        status: 'upcoming',
        oversPerInnings: 10
      },
      {
        teamA: createdTeams[2]._id,
        teamAName: createdTeams[2].name,
        teamB: createdTeams[3]._id,
        teamBName: createdTeams[3].name,
        date: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000),
        time: '19:30',
        location: 'M. A. Chidambaram Stadium, Chennai',
        status: 'upcoming',
        oversPerInnings: 10
      }
    ];

    for (const matchData of matchesData) {
      const match = await Match.create(matchData);
      console.log(`   ✓ ${match.teamAName} vs ${match.teamBName}`);
    }
    console.log('');

    console.log('✅ Database seeding completed successfully!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('Login Credentials:');
    console.log('───────────────────────────────────────────────────');
    console.log('Admin:    admin@turauction.com / admin123');
    console.log('Captain1: captain1@turauction.com / captain123');
    console.log('Captain2: captain2@turauction.com / captain123');
    console.log('Captain3: captain3@turauction.com / captain123');
    console.log('Captain4: captain4@turauction.com / captain123');
    console.log('Viewer:   viewer@turauction.com / viewer123');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
