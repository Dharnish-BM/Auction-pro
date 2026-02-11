import { motion } from 'framer-motion';
import {
    AlertCircle,
    Clock,
    Gavel,
    History,
    Play,
    RotateCcw,
    Square,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader } from '../components/common/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAuction } from '../hooks/useAuction.js';
import { playerService } from '../services/playerService.js';

export const AuctionRoom = () => {
  const { user, isAdmin, isCaptain } = useAuth();
  const { 
    currentAuction, 
    timeRemaining, 
    loading, 
    startAuction, 
    placeBid, 
    endAuction,
    resetAuctions
  } = useAuction();
  
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [playersLoading, setPlayersLoading] = useState(true);

  // Fetch available players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await playerService.getAll({ status: 'unsold' });
        setAvailablePlayers(response.data);
      } catch (error) {
        console.error('Failed to fetch players:', error);
      } finally {
        setPlayersLoading(false);
      }
    };

    fetchPlayers();
  }, [currentAuction]);

  // Update bid amount when auction changes
  useEffect(() => {
    if (currentAuction?.highestBid) {
      setBidAmount((currentAuction.highestBid + 1000).toString());
    }
  }, [currentAuction?.highestBid]);

  const handleStartAuction = async () => {
    if (!selectedPlayer) {
      toast.error('Please select a player');
      return;
    }
    await startAuction(selectedPlayer._id);
    setSelectedPlayer(null);
  };

  const handlePlaceBid = async () => {
    if (!currentAuction) return;
    
    const amount = parseInt(bidAmount);
    if (isNaN(amount) || amount <= currentAuction.highestBid) {
      toast.error(`Bid must be greater than ₹${currentAuction.highestBid.toLocaleString()}`);
      return;
    }

    await placeBid(currentAuction._id, amount);
  };

  const handleEndAuction = async () => {
    if (!currentAuction) return;
    await endAuction(currentAuction._id);
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all auctions? This will refund all teams.')) {
      await resetAuctions();
    }
  };

  if (playersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Auction Room</h1>
        <p className="text-gray-400">Live player bidding</p>
      </div>

      {/* Active Auction */}
      {currentAuction?.status === 'active' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Auction Card */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="sports-card relative overflow-hidden"
            >
              {/* Timer */}
              <div className="absolute top-4 right-4">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  timeRemaining <= 5 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-sports-border text-white'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span className="text-2xl font-bold font-mono">
                    {timeRemaining}s
                  </span>
                </div>
              </div>

              {/* Player Info */}
              <div className="flex items-start space-x-6 mb-8">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-neon-green/20 to-emerald-500/20 flex items-center justify-center">
                  <User className="w-16 h-16 text-neon-green" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {currentAuction.playerName}
                  </h2>
                  <div className="flex items-center space-x-4 text-gray-400">
                    <span className="px-3 py-1 rounded-full bg-sports-border text-sm">
                      {currentAuction.playerId?.role}
                    </span>
                    <span>Base Price: ₹{currentAuction.basePrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Current Bid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-6 rounded-xl bg-gradient-to-br from-neon-green/10 to-emerald-500/10 border border-neon-green/20">
                  <p className="text-gray-400 mb-1">Current Bid</p>
                  <p className="text-4xl font-bold text-neon-green">
                    ₹{currentAuction.highestBid.toLocaleString()}
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-sports-border">
                  <p className="text-gray-400 mb-1">Highest Bidder</p>
                  <p className="text-2xl font-bold text-white">
                    {currentAuction.highestBidderName || 'No bids yet'}
                  </p>
                </div>
              </div>

              {/* Bid Controls */}
              {isCaptain() && (
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-2">Your Bid (₹)</label>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={currentAuction.highestBid + 1000}
                      step={1000}
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={handlePlaceBid}
                    disabled={loading}
                    className="px-8 py-3 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all disabled:opacity-50"
                  >
                    Place Bid
                  </button>
                </div>
              )}

              {/* Admin Controls */}
              {isAdmin() && (
                <div className="mt-6 pt-6 border-t border-sports-border flex space-x-4">
                  <button
                    onClick={handleEndAuction}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all"
                  >
                    <Square className="w-5 h-5" />
                    <span>End Auction</span>
                  </button>
                </div>
              )}
            </motion.div>

            {/* Bid History */}
            <div className="sports-card">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <History className="w-5 h-5 mr-2" />
                Bid History
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentAuction.bidHistory?.length > 0 ? (
                  [...currentAuction.bidHistory].reverse().map((bid, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-sports-border/50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center">
                          <span className="text-neon-green font-semibold">
                            {bid.bidderName.charAt(0)}
                          </span>
                        </div>
                        <span className="text-white">{bid.bidderName}</span>
                      </div>
                      <span className="text-neon-green font-semibold">
                        ₹{bid.amount.toLocaleString()}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No bids yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Auction Status */}
            <div className="sports-card">
              <h3 className="text-lg font-semibold text-white mb-4">Auction Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-neon-green font-medium">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Bids</span>
                  <span className="text-white">{currentAuction.bidHistory?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No Active Auction - Admin Controls */
        <div className="space-y-8">
          {isAdmin() && (
            <div className="sports-card">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Play className="w-5 h-5 mr-2 text-neon-green" />
                Start New Auction
              </h3>
              
              {availablePlayers.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Select Player</label>
                    <select
                      value={selectedPlayer?._id || ''}
                      onChange={(e) => {
                        const player = availablePlayers.find(p => p._id === e.target.value);
                        setSelectedPlayer(player);
                      }}
                      className="w-full"
                    >
                      <option value="">Choose a player...</option>
                      {availablePlayers.map(player => (
                        <option key={player._id} value={player._id}>
                          {player.name} - {player.role} (₹{player.basePrice.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPlayer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-sports-border"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-xl bg-neon-green/10 flex items-center justify-center">
                          <User className="w-8 h-8 text-neon-green" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{selectedPlayer.name}</p>
                          <p className="text-gray-400 text-sm">{selectedPlayer.role}</p>
                          <p className="text-neon-green text-sm">
                            Base Price: ₹{selectedPlayer.basePrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <button
                    onClick={handleStartAuction}
                    disabled={!selectedPlayer || loading}
                    className="w-full py-3 bg-neon-green text-sports-darker font-semibold rounded-xl hover:shadow-neon transition-all disabled:opacity-50"
                  >
                    Start Auction
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No available players for auction</p>
                </div>
              )}

              {/* Reset Button */}
              <div className="mt-6 pt-6 border-t border-sports-border">
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Auctions</span>
                </button>
              </div>
            </div>
          )}

          {/* Waiting State */}
          {!isAdmin() && (
            <div className="sports-card text-center py-16">
              <div className="w-24 h-24 rounded-full bg-sports-border flex items-center justify-center mx-auto mb-6">
                <Gavel className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Active Auction</h3>
              <p className="text-gray-400">Waiting for the admin to start the next auction...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
