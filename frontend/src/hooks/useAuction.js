import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext.jsx';
import { auctionService } from '../services/auctionService.js';

export const useAuction = () => {
  const [currentAuction, setCurrentAuction] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { on, off, joinAuction, leaveAuction } = useSocket();

  // Fetch current auction
  const fetchCurrentAuction = useCallback(async () => {
    try {
      const response = await auctionService.getCurrent();
      setCurrentAuction(response.data);
      if (response.data?.timeRemaining) {
        setTimeRemaining(response.data.timeRemaining);
      }
    } catch (error) {
      console.error('Failed to fetch current auction:', error);
    }
  }, []);

  // Fetch all auctions
  const fetchAuctions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await auctionService.getAll();
      setAuctions(response.data);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch auction history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await auctionService.getHistory();
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch auction history:', error);
    }
  }, []);

  // Start auction
  const startAuction = useCallback(async (playerId, duration = 30) => {
    try {
      setLoading(true);
      const response = await auctionService.start({ playerId, duration });
      setCurrentAuction(response.data);
      setTimeRemaining(duration);
      toast.success('Auction started!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to start auction');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Place bid
  const placeBid = useCallback(async (auctionId, amount) => {
    try {
      const response = await auctionService.placeBid(auctionId, amount);
      setCurrentAuction(response.data);
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to place bid');
      return { success: false, error: error.message };
    }
  }, []);

  // End auction
  const endAuction = useCallback(async (auctionId) => {
    try {
      setLoading(true);
      const response = await auctionService.end(auctionId);
      setCurrentAuction(response.data);
      toast.success(response.data.highestBidder ? 'Player sold!' : 'Auction ended - Player unsold');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to end auction');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset auctions
  const resetAuctions = useCallback(async () => {
    try {
      setLoading(true);
      await auctionService.reset();
      setCurrentAuction(null);
      setAuctions([]);
      toast.success('All auctions reset successfully');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to reset auctions');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    console.log('[Auction] Joining auction room...');
    joinAuction();

    const handleAuctionStarted = (data) => {
      console.log('[Auction] Event: auction-started', data);
      fetchCurrentAuction();
      toast.info(`🎯 Auction started for ${data.player?.name || 'new player'}!`);
    };

    const handleAuctionEnded = (data) => {
      console.log('[Auction] Event: auction-ended', data);
      setCurrentAuction(prev => {
        if (!prev || prev._id.toString() !== data.auctionId) return prev;
        return {
          ...prev,
          status: data.status,
          soldPrice: data.soldPrice,
          soldTo: data.soldTo,
          soldToName: data.soldToName
        };
      });
    };

    const handleBidPlaced = (data) => {
      console.log('[Auction] Event: bid-placed', data);
      setCurrentAuction(prev => {
        if (!prev) {
          console.log('[Auction] No current auction, fetching...');
          fetchCurrentAuction();
          return prev;
        }
        
        // Compare IDs as strings
        const prevId = typeof prev._id === 'string' ? prev._id : prev._id.toString();
        const dataId = typeof data.auctionId === 'string' ? data.auctionId : data.auctionId?.toString();
        
        if (prevId !== dataId) {
          console.log('[Auction] Auction ID mismatch:', prevId, '!==', dataId);
          return prev;
        }
        
        console.log('[Auction] Updating auction with new bid:', data);
        return {
          ...prev,
          highestBid: data.highestBid || data.amount,
          highestBidder: data.highestBidder || data.teamId,
          highestBidderName: data.highestBidderName || data.teamName,
          bidHistory: data.bidHistory || [...(prev.bidHistory || []), {
            bidder: data.teamId,
            bidderName: data.teamName,
            amount: data.amount,
            timestamp: data.timestamp
          }]
        };
      });
    };

    const handleTimerTick = (data) => {
      setTimeRemaining(data.timeRemaining);
    };

    const handleTimerReset = (data) => {
      setTimeRemaining(data.timeRemaining);
      toast.info('Timer reset! New bid in final seconds');
    };

    const handlePlayerSold = (data) => {
      console.log('[Auction] Event: player-sold', data);
      setCurrentAuction(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'completed',
          soldPrice: data.soldPrice,
          soldTo: data.soldTo,
          soldToName: data.soldToName
        };
      });
      toast.success(`🎉 ${data.playerName} sold to ${data.soldToName} for ₹${data.soldPrice.toLocaleString()}!`);
    };

    on('auction-started', handleAuctionStarted);
    on('auction-ended', handleAuctionEnded);
    on('bid-placed', handleBidPlaced);
    on('timer-tick', handleTimerTick);
    on('timer-reset', handleTimerReset);
    on('player-sold', handlePlayerSold);

    return () => {
      console.log('[Auction] Leaving auction room...');
      off('auction-started', handleAuctionStarted);
      off('auction-ended', handleAuctionEnded);
      off('bid-placed', handleBidPlaced);
      off('timer-tick', handleTimerTick);
      off('timer-reset', handleTimerReset);
      off('player-sold', handlePlayerSold);
      leaveAuction();
    };
  }, [on, off, joinAuction, leaveAuction, fetchCurrentAuction]);

  // Initial fetch
  useEffect(() => {
    fetchCurrentAuction();
    fetchAuctions();
    fetchHistory();
  }, [fetchCurrentAuction, fetchAuctions, fetchHistory]);

  return {
    currentAuction,
    auctions,
    history,
    loading,
    timeRemaining,
    fetchCurrentAuction,
    fetchAuctions,
    fetchHistory,
    startAuction,
    placeBid,
    endAuction,
    resetAuctions
  };
};
