import React, { useState, useEffect } from 'react';
import { Droplets, AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Zap, Info, PieChart } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TankLevel = () => {
  const [tankLevel, setTankLevel] = useState(2850);
  const [targetLevel, setTargetLevel] = useState(5000);
  const [status, setStatus] = useState('Good');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restocking, setRestocking] = useState(false);
  const [wasteInfo, setWasteInfo] = useState(null);
  
  // Usable capacity after waste deduction (80% of full capacity)
  const USABLE_PERCENTAGE = 0.80; // 80% usable after 20% waste
  const usableCapacity = targetLevel * USABLE_PERCENTAGE; // 4000L when capacity is 5000L
  
  // Calculate percentages
  const totalPercentage = (tankLevel / targetLevel) * 100; // Based on FULL capacity
  const usablePercentage = (tankLevel / usableCapacity) * 100; // Based on USABLE capacity
  
  // Three equal portions of usable capacity for status
  const goodThreshold = usableCapacity * (2/3); // ~2667L
  const moderateThreshold = usableCapacity * (1/3); // ~1333L
  
  // Fetch tank data on component mount
  useEffect(() => {
    fetchTankData();
    fetchTankHistory();
    fetchWasteInfo();
  }, []);
  
  const fetchTankData = async () => {
    try {
      const response = await api.get('/tank/current');
      const data = response.data.data;
      setTankLevel(data.currentLevel);
      setTargetLevel(data.tankCapacity);
      
      // Determine status based on usable capacity thresholds
      const newStatus = getStatusFromLevel(data.currentLevel, data.tankCapacity);
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to fetch tank data:', error);
      toast.error('Failed to load tank data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWasteInfo = async () => {
    try {
      const response = await api.get('/tank/waste-info');
      setWasteInfo(response.data.data);
    } catch (error) {
      console.error('Failed to fetch waste info:', error);
    }
  };
  
  const fetchTankHistory = async () => {
    try {
      const response = await api.get('/tank/usage/last7days');
      const data = response.data.data;
      
      const formattedHistory = data.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        level: item.level
      }));
      setHistory(formattedHistory);
    } catch (error) {
      console.error('Failed to fetch tank history:', error);
      const mockHistory = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockHistory.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          level: Math.max(0, tankLevel - (6 - i) * 300)
        });
      }
      setHistory(mockHistory);
    }
  };
  
  // Determine status based on water level and usable capacity
  const getStatusFromLevel = (level, capacity) => {
    const usableCap = capacity * USABLE_PERCENTAGE;
    
    if (level >= usableCap * (2/3)) {
      return { text: 'Good', color: 'text-green-600', bg: 'bg-green-50', icon: '✅' };
    } else if (level >= usableCap * (1/3)) {
      return { text: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '⚠️' };
    } else {
      return { text: 'Critical', color: 'text-red-600', bg: 'bg-red-50', icon: '🔴' };
    }
  };
  
  // Get warning message based on current level
  const getWarningMessage = (level, capacity) => {
    const usableCap = capacity * USABLE_PERCENTAGE;
    const portion = usableCap / 3;
    
    if (level >= usableCap * (2/3)) {
      return {
        message: "Water level is healthy. Good supply available.",
        action: "Monitor regularly",
        urgent: false
      };
    } else if (level >= usableCap * (1/3)) {
      const remainingPortions = Math.ceil((usableCap - level) / portion);
      return {
        message: `Water level is getting low. About ${remainingPortions} portion(s) remaining before critical.`,
        action: "Plan to restock soon",
        urgent: false
      };
    } else {
      const estimatedDays = Math.floor(level / 300);
      return {
        message: `⚠️ CRITICAL: Water level is very low! Only ${level}L remaining.`,
        action: "Restock immediately!",
        urgent: true
      };
    }
  };
  
  const handleAddWater = async (liters) => {
    setRestocking(true);
    try {
      const response = await api.post('/tank/restock', {
        amountLiters: liters,
        notes: 'Restocked from dashboard'
      });
      
      const newLevel = response.data.data.currentLevel;
      setTankLevel(newLevel);
      
      const newStatus = getStatusFromLevel(newLevel, targetLevel);
      setStatus(newStatus);
      
      toast.success(`Successfully added ${liters}L of water`);
      fetchTankHistory();
    } catch (error) {
      console.error('Failed to restock tank:', error);
      toast.error(error.response?.data?.message || 'Failed to restock tank');
    } finally {
      setRestocking(false);
    }
  };
  
  const handleFillToFull = async () => {
    const remainingToFull = targetLevel - tankLevel;
    
    if (remainingToFull <= 0) {
      toast.error('Tank is already full!');
      return;
    }
    
    await handleAddWater(remainingToFull);
  };
  
  const statusObj = getStatusFromLevel(tankLevel, targetLevel);
  const warning = getWarningMessage(tankLevel, targetLevel);
  const estimatedDays = Math.floor(tankLevel / 300);
  const remainingCapacity = targetLevel - tankLevel;
  const usableCapacityVal = targetLevel * USABLE_PERCENTAGE;
  const remainingUsable = Math.max(0, usableCapacityVal - tankLevel);
  
  // Calculate portion thresholds for display
  const goodMin = Math.round(usableCapacityVal * (2/3));
  const moderateMin = Math.round(usableCapacityVal * (1/3));
  
  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tank Level Monitor</h1>
        <p className="text-gray-600 mt-1">Monitor and manage water tank levels</p>
      </div>
      
      {/* Waste Information Card */}
      {wasteInfo && (
        <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-orange-700">
              <strong>Note:</strong> 20% waste is deducted when filling to full capacity. 
              Usable water capacity: {Math.round(usableCapacityVal)}L (80% of {targetLevel}L)
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Tank Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Droplets className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Current Tank Status</h2>
            </div>
            <RefreshCw 
              onClick={fetchTankData} 
              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
            />
          </div>
          
          {/* Dual Percentage Display */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600">Total Fill %</p>
              <p className="text-2xl font-bold text-blue-600">{Math.round(totalPercentage)}%</p>
              <p className="text-xs text-gray-500">of {targetLevel}L</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600">Usable Fill %</p>
              <p className="text-2xl font-bold text-green-600">{Math.round(usablePercentage)}%</p>
              <p className="text-xs text-gray-500">of {Math.round(usableCapacityVal)}L usable</p>
            </div>
          </div>
          
          {/* Portion labels */}
          <div className="flex justify-between mb-2 text-xs font-medium">
            <span className="text-green-600">Good ({goodMin}L - {Math.round(usableCapacityVal)}L)</span>
            <span className="text-yellow-600">Moderate ({moderateMin}L - {goodMin}L)</span>
            <span className="text-red-600">Critical (0L - {moderateMin}L)</span>
          </div>
          
          {/* Tank Visualization with Total Percentage */}
          <div className="relative mb-6">
            <div className="bg-gray-100 rounded-lg h-64 overflow-hidden relative">
              {/* Background color sections based on usable capacity */}
              <div className="absolute inset-0 flex flex-col">
                <div className="bg-green-200 h-1/3" style={{ height: '33.33%' }}></div>
                <div className="bg-yellow-200 h-1/3" style={{ height: '33.33%' }}></div>
                <div className="bg-red-200 h-1/3" style={{ height: '33.33%' }}></div>
              </div>
              
              {/* Water level overlay - using TOTAL percentage */}
              <div 
                className={`absolute bottom-0 left-0 right-0 transition-all duration-500 flex items-center justify-center text-white font-bold ${
                  usablePercentage < 33 ? 'bg-red-500' : 
                  usablePercentage < 66 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ height: `${Math.min(100, Math.max(0, totalPercentage))}%` }}
              >
                {Math.round(totalPercentage)}%
              </div>
            </div>
          </div>
          
          {/* Stats Row - 3 columns */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Current Level</p>
              <p className="text-xl font-bold text-gray-900">{tankLevel}L</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Usable Capacity</p>
              <p className="text-xl font-bold text-blue-600">{Math.round(usableCapacityVal)}L</p>
              <p className="text-xs text-gray-400">(80% of {targetLevel}L)</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Full Capacity</p>
              <p className="text-xl font-bold text-purple-600">{targetLevel}L</p>
            </div>
          </div>
          
          {/* Status Card */}
          <div className={`mb-6 p-4 rounded-lg ${statusObj.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${statusObj.color}`}>
                  {statusObj.icon} {statusObj.text}
                </p>
                <p className="text-xs mt-1">{warning.message}</p>
              </div>
              {warning.urgent && (
                <button
                  onClick={() => handleAddWater(1000)}
                  className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                >
                  {warning.action}
                </button>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handleAddWater(500)}
              disabled={restocking}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {restocking ? 'Adding...' : 'Add 500L'}
            </button>
            <button
              onClick={() => handleAddWater(1000)}
              disabled={restocking}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {restocking ? 'Adding...' : 'Add 1000L'}
            </button>
            <button
              onClick={handleFillToFull}
              disabled={restocking || tankLevel >= targetLevel}
              className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                tankLevel >= targetLevel
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>
                {tankLevel >= targetLevel 
                  ? 'Tank Full' 
                  : `Fill to Full (${remainingCapacity}L needed)`}
              </span>
            </button>
          </div>
        </div>
        
        {/* Usage History & Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Usage (Last 7 Days)</h2>
            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 w-16">{day.date}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(day.level / targetLevel) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">{day.level}L</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No usage history available
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Consumption Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Level</span>
                <span className="font-medium text-gray-900">{tankLevel}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Full Capacity</span>
                <span className="font-medium text-gray-900">{targetLevel}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Usable Capacity</span>
                <span className="font-medium text-gray-900">{Math.round(usableCapacityVal)}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining Usable</span>
                <span className={`font-medium ${
                  remainingUsable < moderateMin ? 'text-red-600' : 
                  remainingUsable < goodMin ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {Math.round(remainingUsable)}L
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remaining to Full</span>
                <span className="font-medium text-gray-900">{remainingCapacity}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Fill %</span>
                <span className="font-medium text-blue-600">{Math.round(totalPercentage)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Usable Fill %</span>
                <span className={`font-medium ${statusObj.color}`}>{Math.round(usablePercentage)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium ${statusObj.color}`}>{statusObj.text}</span>
              </div>
              {statusObj.text === 'Critical' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Days Left</span>
                  <span className="font-medium text-red-600">{estimatedDays} days</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Water Level Guide */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Water Level Guide</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Good (Healthy)</span>
                </div>
                <span className="text-sm font-medium">{goodMin}L - {Math.round(usableCapacityVal)}L usable</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Moderate (Plan to Restock)</span>
                </div>
                <span className="text-sm font-medium">{moderateMin}L - {goodMin}L usable</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Critical (Restock Now!)</span>
                </div>
                <span className="text-sm font-medium">0L - {moderateMin}L usable</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Full Capacity (Total)</span>
                </div>
                <span className="text-sm font-medium">{targetLevel}L</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg mt-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Waste Deduction</span>
                </div>
                <span className="text-sm font-medium">{Math.round(targetLevel * 0.20)}L (20%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TankLevel;