import React, { useState, useEffect } from 'react';
import { Droplets, AlertTriangle, CheckCircle, RefreshCw, Filter, Activity, Plus, Edit, Calendar, Search, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const FilterStatus = () => {
  const [filters, setFilters] = useState([]);
  const [maintenanceLog, setMaintenanceLog] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    percentage: 100,
    action: '',
    technician: '',
    maintenanceDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Filter states for maintenance log
  const [logFilters, setLogFilters] = useState({
    filterName: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const [stats, setStats] = useState({
    totalFilters: 0,
    overallHealth: 0,
    warningCount: 0,
    criticalCount: 0,
    goodCount: 0
  });

  useEffect(() => {
    fetchFilters();
    fetchMaintenanceLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [maintenanceLog, logFilters]);

  const fetchFilters = async () => {
    try {
      const response = await api.get('/filters');
      setFilters(response.data.data);
      
      const total = response.data.data.length;
      const critical = response.data.data.filter(f => f.percentage < 30).length;
      const warning = response.data.data.filter(f => f.percentage >= 30 && f.percentage < 70).length;
      const good = total - critical - warning;
      const overall = Math.round(response.data.data.reduce((sum, f) => sum + f.percentage, 0) / total);
      
      setStats({
        totalFilters: total,
        overallHealth: overall,
        warningCount: warning,
        criticalCount: critical,
        goodCount: good
      });
    } catch (error) {
      console.error('Failed to fetch filters:', error);
      toast.error('Failed to load filter data');
    }
  };

  const fetchMaintenanceLogs = async () => {
    try {
      const response = await api.get('/filters/maintenance-logs');
      setMaintenanceLog(response.data.data);
      setFilteredLogs(response.data.data);
    } catch (error) {
      console.error('Failed to fetch maintenance logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...maintenanceLog];
    
    // Filter by filter name
    if (logFilters.filterName) {
      filtered = filtered.filter(log => 
        log.filterName?.toLowerCase().includes(logFilters.filterName.toLowerCase())
      );
    }
    
    // Filter by start date
    if (logFilters.startDate) {
      filtered = filtered.filter(log => log.maintenanceDate >= logFilters.startDate);
    }
    
    // Filter by end date
    if (logFilters.endDate) {
      filtered = filtered.filter(log => log.maintenanceDate <= logFilters.endDate);
    }
    
    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setLogFilters({
      filterName: '',
      startDate: '',
      endDate: ''
    });
    setFilteredLogs(maintenanceLog);
  };

  // Calculate status based on percentage
  const getStatusFromPercentage = (percentage) => {
    if (percentage > 70) return 'GOOD';
    if (percentage > 30) return 'WARNING';
    return 'CRITICAL';
  };

  // Handle percentage change - auto-update status
  const handlePercentageChange = (percentage) => {
    const newStatus = getStatusFromPercentage(percentage);
    setUpdateData({
      ...updateData,
      percentage: percentage,
      status: newStatus
    });
  };

  const handleUpdateFilter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Update filter status and percentage
      await api.put(`/filters/${selectedFilter.id}/update`, null, {
        params: {
          status: updateData.status,
          percentage: updateData.percentage,
          notes: updateData.notes
        }
      });
      
      // Add maintenance log with the SELECTED DATE
      if (updateData.action && updateData.technician) {
        await api.post('/filters/maintenance-log', null, {
          params: {
            filterName: selectedFilter.name,
            action: updateData.action,
            technician: updateData.technician,
            maintenanceDate: updateData.maintenanceDate,
            notes: updateData.notes || `Filter updated. New status: ${getDisplayStatus(updateData.status)}, New percentage: ${updateData.percentage}%`
          }
        });
      }
      
      toast.success(`Filter ${selectedFilter.name} updated successfully!`);
      setShowUpdateModal(false);
      setSelectedFilter(null);
      setUpdateData({
        status: '',
        percentage: 100,
        action: '',
        technician: '',
        maintenanceDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchFilters();
      fetchMaintenanceLogs();
      
    } catch (error) {
      console.error('Failed to update filter:', error);
      toast.error(error.response?.data?.message || 'Failed to update filter');
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateModal = (filter) => {
    setSelectedFilter(filter);
    setUpdateData({
      status: filter.status,
      percentage: filter.percentage,
      action: '',
      technician: '',
      maintenanceDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowUpdateModal(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'GOOD': return 'text-green-600 bg-green-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDisplayStatus = (status) => {
    switch(status) {
      case 'GOOD': return 'Good';
      case 'WARNING': return 'Warning';
      case 'CRITICAL': return 'Critical';
      default: return status;
    }
  };

  const getPercentageColor = (percentage) => {
    if (percentage > 70) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Filter Status</h1>
          <p className="text-gray-600 mt-1">Monitor and manage water filtration system</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <Filter className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.totalFilters}</span>
          </div>
          <p className="text-sm text-gray-600">Active Filters</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.overallHealth}%</span>
          </div>
          <p className="text-sm text-gray-600">Overall Health</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div className={`h-1 rounded-full ${getPercentageColor(stats.overallHealth)}`} style={{ width: `${stats.overallHealth}%` }}></div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.warningCount}</span>
          </div>
          <p className="text-sm text-gray-600">Need Attention</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.criticalCount}</span>
          </div>
          <p className="text-sm text-gray-600">Critical</p>
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {filters.map((filter) => (
          <div 
            key={filter.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Droplets className="w-6 h-6 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{filter.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{filter.type || 'Standard Filter'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(filter.status)}`}>
                  {getDisplayStatus(filter.status)}
                </span>
                <button
                  onClick={() => openUpdateModal(filter)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Update Filter"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Lifespan Remaining</span>
                <span className="font-medium">{filter.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${getPercentageColor(filter.percentage)}`}
                  style={{ width: `${filter.percentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Last Changed</p>
                <p className="font-medium text-gray-900">{filter.lastChanged}</p>
              </div>
              <div>
                <p className="text-gray-500">Expected Lifespan</p>
                <p className="font-medium text-gray-900">{filter.lifespan} days</p>
              </div>
            </div>
            
            {filter.percentage < 30 && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-800 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Replace immediately! Filter efficiency is critically low.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Maintenance Log with Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Maintenance Log</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
          </button>
        </div>
        
        {/* Filter Bar */}
        {showFilters && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Name</label>
                <select
                  value={logFilters.filterName}
                  onChange={(e) => setLogFilters({...logFilters, filterName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Filters</option>
                  {filters.map(filter => (
                    <option key={filter.id} value={filter.name}>{filter.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={logFilters.startDate}
                  onChange={(e) => setLogFilters({...logFilters, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={logFilters.endDate}
                  onChange={(e) => setLogFilters({...logFilters, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center justify-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Clear Filters</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{log.maintenanceDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.filterName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.technician}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-500">
                    No maintenance logs found matching the filters
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Filter Modal */}
      {showUpdateModal && selectedFilter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Update Filter: {selectedFilter.name}</h2>
              <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateFilter} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg mb-2">
                <p className="text-sm text-gray-600">Current Status</p>
                <p className="text-lg font-semibold">{getDisplayStatus(selectedFilter.status)} ({selectedFilter.percentage}%)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Percentage *</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={updateData.percentage}
                  onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-red-500">0%</span>
                  <span className="text-yellow-500">30%</span>
                  <span className="text-green-500">70%</span>
                  <span className="text-green-600">100%</span>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={updateData.percentage}
                    onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
              
              {/* Auto-calculated Status Display */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Status will be:</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${updateData.percentage > 70 ? 'bg-green-500' : updateData.percentage > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className={`font-semibold ${
                    updateData.percentage > 70 ? 'text-green-600' : 
                    updateData.percentage > 30 ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {updateData.percentage > 70 ? 'Good' : updateData.percentage > 30 ? 'Warning' : 'Critical'}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-2">
                <h3 className="text-md font-medium text-gray-800 mb-3">Maintenance Record</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action *</label>
                  <select
                    required
                    value={updateData.action}
                    onChange={(e) => setUpdateData({...updateData, action: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Action</option>
                    <option value="Replaced">Replaced</option>
                    <option value="Cleaned">Cleaned</option>
                    <option value="Inspected">Inspected</option>
                    <option value="Repaired">Repaired</option>
                  </select>
                </div>
                
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technician *</label>
                  <input
                    type="text"
                    required
                    value={updateData.technician}
                    onChange={(e) => setUpdateData({...updateData, technician: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter technician name"
                  />
                </div>
                
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Maintenance Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={updateData.maintenanceDate}
                    onChange={(e) => setUpdateData({...updateData, maintenanceDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select the date when maintenance was performed</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Additional notes (optional)"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Filter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterStatus;