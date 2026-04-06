// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Activity, ArrowLeft, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader } from '../components/common/Loader.jsx';
import { matchService } from '../services/matchService.js';

export const LiveScoreboard = () => {
  const { id } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const response = await matchService.getLivePublic(id);
        setPayload(response.data);
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

  if (!payload) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-400">Match not found</p>
      </div>
    );
  }

  const match = payload.match;
  const liveState = payload.liveState;
  const inningsSummary = payload.inningsSummary;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link to="/matches" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Matches
      </Link>

      {/* Match Header (minimal public view) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sports-card mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-bold text-xl">Live Score</p>
            <p className="text-gray-400 text-sm capitalize">Status: {match.status?.replace('_', ' ')}</p>
          </div>
          {match.status === 'live' && (
            <div className="flex items-center">
              <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2" />
              <span className="text-neon-green text-sm font-semibold">LIVE</span>
            </div>
          )}
        </div>
        <div className="text-gray-400 text-sm">
          <p>{match.venue || match.location}</p>
        </div>
      </motion.div>

      {/* Main Scoreboard (minimal) */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 sports-card">
          <h3 className="text-lg font-semibold text-white mb-4">Innings Summary</h3>
          {inningsSummary ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-sports-border/30">
                <p className="text-gray-400 text-sm">Score</p>
                <p className="text-white text-2xl font-bold">
                  {inningsSummary.totalRuns}/{inningsSummary.totalWickets}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-sports-border/30">
                <p className="text-gray-400 text-sm">Balls</p>
                <p className="text-white text-2xl font-bold">{inningsSummary.totalBalls}</p>
              </div>
              <div className="p-4 rounded-lg bg-sports-border/30">
                <p className="text-gray-400 text-sm">Target</p>
                <p className="text-white text-2xl font-bold">{inningsSummary.target || '-'}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No innings has started yet.</p>
          )}
        </div>

        <div className="space-y-6">
          <div className="sports-card">
            <h3 className="text-lg font-semibold text-white mb-4">Live State</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Striker</span>
                <span className="text-white">{liveState?.strikerName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Non-striker</span>
                <span className="text-white">{liveState?.nonStrikerName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bowler</span>
                <span className="text-white">{liveState?.currentBowlerName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last 6</span>
                <span className="text-white">{(liveState?.lastSixBalls || []).join(' ') || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
