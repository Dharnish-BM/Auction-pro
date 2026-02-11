import { motion } from 'framer-motion';
import { Activity, ArrowLeft, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader } from '../components/common/Loader.jsx';
import { matchService } from '../services/matchService.js';

export const LiveScoreboard = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const response = await matchService.getById(id);
        setMatch(response.data);
      } catch (error) {
        console.error('Failed to fetch match:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-400">Match not found</p>
      </div>
    );
  }

  const isTeamABatting = match.data.scorecard.currentInnings === 'teamA';
  const battingTeam = isTeamABatting ? match.data.teamA : match.data.teamB;
  const bowlingTeam = isTeamABatting ? match.data.teamB : match.data.teamA;
  const battingScore = isTeamABatting ? match.data.scorecard.teamAScore : match.data.scorecard.teamBScore;
  const bowlingScore = isTeamABatting ? match.data.scorecard.teamBScore : match.data.scorecard.teamAScore;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link to="/matches" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Matches
      </Link>

      {/* Match Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sports-card mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
              style={{ backgroundColor: match.data.teamA.color }}
            >
              {match.data.teamA.name.charAt(0)}
            </div>
            <span className="text-xl font-bold text-white">{match.data.teamA.name}</span>
          </div>
          
          <div className="text-center">
            <span className="text-gray-500 font-bold text-lg">VS</span>
            {match.data.status === 'live' && (
              <div className="flex items-center justify-center mt-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
                <span className="text-red-400 text-sm">LIVE</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-xl font-bold text-white">{match.data.teamB.name}</span>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
              style={{ backgroundColor: match.data.teamB.color }}
            >
              {match.data.teamB.name.charAt(0)}
            </div>
          </div>
        </div>

        {/* Location & Date */}
        <div className="text-center text-gray-400 text-sm">
          <p>{match.data.location}</p>
          <p>{new Date(match.data.date).toLocaleDateString()} • {match.data.time}</p>
        </div>
      </motion.div>

      {/* Main Scoreboard */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Score Card */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="sports-card"
          >
            {/* Batting Team */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: battingTeam.color }}
                >
                  {battingTeam.name.charAt(0)}
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Batting</p>
                  <h2 className="text-2xl font-bold text-white">{battingTeam.name}</h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-5xl font-bold text-white">
                  {battingScore.runs}/{battingScore.wickets}
                </p>
                <p className="text-gray-400">
                  {battingScore.overs}.{battingScore.balls} overs
                </p>
              </div>
            </div>

            {/* Run Rate */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-sports-border/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-green">
                  {match.data.derivedStats?.teamARunRate || '0.00'}
                </p>
                <p className="text-xs text-gray-400">Run Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gold">
                  {match.data.derivedStats?.requiredRunRate || '-'}
                </p>
                <p className="text-xs text-gray-400">Required RR</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {match.data.scorecard.extras?.total || 0}
                </p>
                <p className="text-xs text-gray-400">Extras</p>
              </div>
            </div>
          </motion.div>

          {/* Batsmen */}
          <div className="sports-card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-neon-green" />
              Batsmen
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="pb-3">Batsman</th>
                    <th className="pb-3 text-right">R</th>
                    <th className="pb-3 text-right">B</th>
                    <th className="pb-3 text-right">4s</th>
                    <th className="pb-3 text-right">6s</th>
                    <th className="pb-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {match.data.scorecard.currentBatsmen?.map((batsman, index) => (
                    <tr key={index} className="border-t border-sports-border/50">
                      <td className="py-3">
                        <div className="flex items-center">
                          <span className="text-white font-medium">{batsman.name}</span>
                          {batsman.isOnStrike && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-neon-green/20 text-neon-green rounded">
                              Strike
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right text-white font-bold">{batsman.runs}</td>
                      <td className="py-3 text-right text-gray-400">{batsman.balls}</td>
                      <td className="py-3 text-right text-gray-400">{batsman.fours}</td>
                      <td className="py-3 text-right text-gray-400">{batsman.sixes}</td>
                      <td className="py-3 text-right text-neon-green">
                        {batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan="6" className="py-4 text-center text-gray-500">
                        No batsmen data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowler */}
          {match.data.scorecard.currentBowler && (
            <div className="sports-card">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-neon-blue" />
                Current Bowler
              </h3>
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <p className="text-white font-medium">{match.data.scorecard.currentBowler.name}</p>
                  <p className="text-xs text-gray-400">Bowler</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">
                    {match.data.scorecard.currentBowler.overs}.{match.data.scorecard.currentBowler.balls}
                  </p>
                  <p className="text-xs text-gray-400">Overs</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{match.data.scorecard.currentBowler.runs}</p>
                  <p className="text-xs text-gray-400">Runs</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-neon-green">{match.data.scorecard.currentBowler.wickets}</p>
                  <p className="text-xs text-gray-400">Wickets</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gold">
                    {match.data.scorecard.currentBowler.overs > 0 
                      ? (match.data.scorecard.currentBowler.runs / match.data.scorecard.currentBowler.overs).toFixed(1)
                      : '0.0'}
                  </p>
                  <p className="text-xs text-gray-400">Economy</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Match Info */}
          <div className="sports-card">
            <h3 className="text-lg font-semibold text-white mb-4">Match Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-white capitalize">{match.data.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Overs</span>
                <span className="text-white">{match.data.oversPerInnings}</span>
              </div>
              {match.data.tossWinner && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Toss</span>
                  <span className="text-white">{match.data.tossWinner.name}</span>
                </div>
              )}
              {match.data.scorecard.target && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Target</span>
                  <span className="text-gold">{match.data.scorecard.target}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fall of Wickets */}
          {match.data.scorecard.fallOfWickets?.length > 0 && (
            <div className="sports-card">
              <h3 className="text-lg font-semibold text-white mb-4">Fall of Wickets</h3>
              <div className="space-y-2">
                {match.data.scorecard.fallOfWickets.map((fow, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-400">{fow.wicket}. {fow.batsman}</span>
                    <span className="text-white">{fow.runs} ({fow.over})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
