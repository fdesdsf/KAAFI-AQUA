import React, { useState, useEffect } from 'react';
import { Droplets, Settings, Save, X, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const TankSettings = () => {
  const [tankData, setTankData] = useState({
    id: null,
    currentLevel: 0,
    tankCapacity: 5000,
    percentage: 0,
    status: 'MODERATE',
    lastUpdated: null,
    updatedBy: null
  });
  
  const [formData, setFormData] = useState({
    tankCapacity: 5000,
    currentLevel: 0,
    notes: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [wasteInfo, setWasteInfo] = useState(null); // ADD THIS STATE

  useEffect(() => {
    fetchCurrentTankData();
    fetchWasteInfo(); // ADD THIS LINE
  }, []);

  // ADD THIS NEW FUNCTION
  const fetchWasteInfo = async () => {
    try {
      const response = await api.get('/tank/waste-info');
      setWasteInfo(response.data.data);
    } catch (error) {
      console.error('Failed to fetch waste info:', error);
    }
  };

  const fetchCurrentTankData = async () => {
    try {
      const response = await api.get('/tank/current');
      const data = response.data.data;
      setTankData(data);
      setFormData({
        tankCapacity: data.tankCapacity,
        currentLevel: data.currentLevel,
        notes: ''
      });
    } catch (error) {
      console.error('Failed to fetch tank data:', error);
      toast.error('Failed to load tank data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.tankCapacity || formData.tankCapacity <= 0) {
      errors.tankCapacity = 'Tank capacity must be greater than 0';
    }
    
    if (formData.currentLevel < 0) {
      errors.currentLevel = 'Current level cannot be negative';
    }
    
    if (formData.currentLevel > formData.tankCapacity) {
      errors.currentLevel = `Current level cannot exceed capacity (${formData.tankCapacity}L)`;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInitializeTank = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const response = await api.post('/tank/initialize', {
        tankCapacity: formData.tankCapacity,
        currentLevel: formData.currentLevel,
        notes: formData.notes || 'Tank initialized from settings'
      });
      
      const data = response.data.data;
      setTankData(data);
      toast.success(`Tank initialized successfully with capacity ${data.tankCapacity}L`);
      setShowConfirmModal(false);
      setFormData({ ...formData, notes: '' });
      fetchWasteInfo(); // REFRESH WASTE INFO
    } catch (error) {
      console.error('Failed to initialize tank:', error);
      toast.error(error.response?.data?.message || 'Failed to initialize tank');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCapacity = async () => {
    if (!formData.tankCapacity || formData.tankCapacity <= 0) {
      toast.error('Please enter a valid tank capacity');
      return;
    }
    
    if (formData.tankCapacity < tankData.currentLevel) {
      toast.error(`Cannot set capacity below current level (${tankData.currentLevel}L). Please reduce water level first.`);
      return;
    }
    
    setSaving(true);
    try {
      const response = await api.put('/tank/capacity', {
        tankCapacity: formData.tankCapacity,
        notes: formData.notes || 'Updated tank capacity'
      });
      
      const data = response.data.data;
      setTankData(data);
      toast.success(`Tank capacity updated to ${formData.tankCapacity}L`);
      setFormData({ ...formData, notes: '' });
      fetchWasteInfo(); // REFRESH WASTE INFO
    } catch (error) {
      console.error('Failed to update capacity:', error);
      toast.error(error.response?.data?.message || 'Failed to update tank capacity');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLevel = async () => {
    if (formData.currentLevel < 0 || formData.currentLevel > tankData.tankCapacity) {
      toast.error(`Current level must be between 0 and ${tankData.tankCapacity}L`);
      return;
    }
    
    setSaving(true);
    try {
      const response = await api.put('/tank/level', {
        currentLevel: formData.currentLevel,
        notes: formData.notes || 'Updated water level'
      });
      
      const data = response.data.data;
      setTankData(data);
      toast.success(`Water level updated to ${formData.currentLevel}L`);
      setFormData({ ...formData, notes: '' });
      fetchWasteInfo(); // REFRESH WASTE INFO
    } catch (error) {
      console.error('Failed to update level:', error);
      toast.error(error.response?.data?.message || 'Failed to update water level');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'GOOD') return 'text-green-600 bg-green-50';
    if (status === 'MODERATE') return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (status) => {
    if (status === 'GOOD') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'MODERATE') return <Info className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Tank Configuration</h2>
        <p className="text-sm text-gray-500 mt-1">Configure water tank capacity and current water level</p>
      </div>

      {/* ADD THIS WASTE INFORMATION CARD */}
      {wasteInfo && (
        <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-medium text-orange-800">Water Waste Policy</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">When tank reaches full capacity</p>
              <p className="text-xl font-bold text-orange-600">{wasteInfo.wastePercentage}% Waste Deduction</p>
              <p className="text-xs text-gray-500 mt-1">
                {wasteInfo.wasteAmountOnFull}L will be deducted from {wasteInfo.fullCapacity}L
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">Effective water level after full fill</p>
              <p className="text-xl font-bold text-green-600">{wasteInfo.effectiveLevelWhenFull}L</p>
              <p className="text-xs text-gray-500 mt-1">
                Instead of {wasteInfo.fullCapacity}L, you get {wasteInfo.effectiveLevelWhenFull}L usable water
              </p>
            </div>
          </div>
          
          <div className="mt-3 p-2 bg-orange-100 rounded-lg">
            <p className="text-xs text-orange-700">
              ⚠️ Note: 20% waste is automatically deducted when water level reaches full capacity to account for 
              water loss during filling, spillage, evaporation, and maintenance.
            </p>
          </div>
        </div>
      )}

      {/* Current Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Droplets className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Current Tank Status</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Current Level</p>
            <p className="text-2xl font-bold text-gray-900">{tankData.currentLevel}L</p>
            <p className="text-xs text-gray-500 mt-1">{tankData.percentage?.toFixed(1)}% of capacity</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tank Capacity</p>
            <p className="text-2xl font-bold text-gray-900">{tankData.tankCapacity}L</p>
          </div>
          
          <div className={`rounded-lg p-4 ${getStatusColor(tankData.status)}`}>
            <div className="flex items-center space-x-2">
              {getStatusIcon(tankData.status)}
              <p className="text-sm font-medium">Status: {tankData.status}</p>
            </div>
            {tankData.lastUpdated && (
              <p className="text-xs mt-2 opacity-75">
                Last updated: {new Date(tankData.lastUpdated).toLocaleString()}
              </p>
            )}
            {tankData.updatedBy && (
              <p className="text-xs opacity-75">By: {tankData.updatedBy}</p>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Capacity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Update Tank Capacity
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Change the maximum capacity of your water tank
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Tank Capacity (Liters)
              </label>
              <input
                type="number"
                value={formData.tankCapacity}
                onChange={(e) => setFormData({...formData, tankCapacity: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter capacity in liters"
                min="1"
              />
              {validationErrors.tankCapacity && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.tankCapacity}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Why are you updating the capacity?"
              />
            </div>
            
            <button
              onClick={handleUpdateCapacity}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Capacity'}
            </button>
          </div>
        </div>

        {/* Update Water Level */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingDown className="w-5 h-5 mr-2 text-blue-600" />
            Adjust Water Level
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Manually adjust the current water level in the tank
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Water Level (Liters)
              </label>
              <input
                type="number"
                value={formData.currentLevel}
                onChange={(e) => setFormData({...formData, currentLevel: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter current water level"
                min="0"
                max={tankData.tankCapacity}
              />
              <p className="text-xs text-gray-500 mt-1">
                Range: 0 - {tankData.tankCapacity}L
              </p>
              {validationErrors.currentLevel && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.currentLevel}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Reason for adjusting water level"
              />
            </div>
            
            <button
              onClick={handleUpdateLevel}
              disabled={saving}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Water Level'}
            </button>
          </div>
        </div>
      </div>

      {/* Full Tank Initialization */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Tank Initialization</h3>
            <p className="text-sm text-gray-500">
              Reset both capacity and water level. This will create a new tank record and archive the current one.
              Use this for initial setup or major tank changes.
            </p>
          </div>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Initialize Tank
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <p className="text-xs text-yellow-800">
              Warning: Initializing the tank will create a new tank record. The current tank data will be archived.
              This action is recommended only for initial setup or when replacing the tank.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Confirm Tank Initialization</h2>
              <button onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">This action will:</p>
                    <ul className="text-xs text-red-700 mt-2 space-y-1 list-disc list-inside">
                      <li>Create a new tank record with your settings</li>
                      <li>Archive the current tank data</li>
                      <li>Reset usage history for the new tank</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tank Capacity (Liters)
                </label>
                <input
                  type="number"
                  value={formData.tankCapacity}
                  onChange={(e) => setFormData({...formData, tankCapacity: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Water Level (Liters)
                </label>
                <input
                  type="number"
                  value={formData.currentLevel}
                  onChange={(e) => setFormData({...formData, currentLevel: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  max={formData.tankCapacity}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows="2"
                  placeholder="Reason for initialization"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInitializeTank}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Initializing...' : 'Yes, Initialize Tank'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TankSettings;