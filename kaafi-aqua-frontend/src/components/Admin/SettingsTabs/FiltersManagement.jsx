// src/pages/SettingsTabs/FiltersManagement.jsx
import React, { useState, useEffect } from 'react';
import { Filter, Plus, Edit, Trash2, Search, X, Save, RefreshCw, AlertTriangle, Droplet } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const FiltersManagement = () => {
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    lifespan: '',
    description: ''
  });

  // Default filters to initialize if none exist
  const defaultFilters = [
    { name: 'Sediment Filter', type: 'Sediment', lifespan: 90, description: 'Removes sand, rust, and large particles' },
    { name: 'Carbon Filter', type: 'Carbon', lifespan: 90, description: 'Removes chlorine, odors, and organic compounds' },
    { name: 'Reverse Osmosis Membrane', type: 'RO', lifespan: 180, description: 'Removes dissolved solids and contaminants' },
    { name: 'UV Filter', type: 'UV', lifespan: 365, description: 'Kills bacteria and viruses' },
    { name: 'Alkaline Filter', type: 'Alkaline', lifespan: 180, description: 'Adds minerals and balances pH' }
  ];

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setLoading(true);
    setError(null);
    console.log('🔍 [FiltersManagement] Fetching filters from API...');
    
    try {
      const response = await api.get('/filters');
      console.log('✅ [FiltersManagement] API Response:', response.data);
      
      if (response.data && response.data.data) {
        if (response.data.data.length > 0) {
          console.log(`✅ [FiltersManagement] Found ${response.data.data.length} filters`);
          setFilters(response.data.data);
        } else {
          console.warn('⚠️ [FiltersManagement] Filters array is empty');
          setFilters([]);
        }
      } else {
        console.warn('⚠️ [FiltersManagement] No data property in response');
        setFilters([]);
      }
    } catch (error) {
      console.error('❌ [FiltersManagement] Failed to fetch filters:', error);
      setError(error.response?.data?.message || 'Failed to load filters');
      toast.error('Failed to load filters');
    } finally {
      setLoading(false);
    }
  };

  const initializeFilters = async () => {
    console.log('🚀 [FiltersManagement] Initializing filters with defaults:', defaultFilters);
    setInitializing(true);
    setError(null);
    
    try {
      let successCount = 0;
      for (const filter of defaultFilters) {
        try {
          await api.post('/filters/admin/filters', filter);
          successCount++;
          console.log(`✅ Created filter: ${filter.name}`);
        } catch (err) {
          console.error(`❌ Failed to create filter ${filter.name}:`, err);
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} default filters created successfully`);
        await fetchFilters();
      } else {
        toast.error('Failed to create default filters');
      }
    } catch (error) {
      console.error('❌ [FiltersManagement] Failed to initialize filters:', error);
      setError(error.response?.data?.message || 'Failed to initialize filters');
      toast.error(error.response?.data?.message || 'Failed to initialize filters');
    } finally {
      setInitializing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Filter name is required');
      return;
    }

    const filterData = {
      name: formData.name,
      type: formData.type || null,
      lifespan: formData.lifespan ? parseInt(formData.lifespan) : null,
      description: formData.description || null
    };

    try {
      if (editingFilter) {
        await api.put(`/filters/admin/filters/${editingFilter.id}`, filterData);
        toast.success('Filter updated successfully');
      } else {
        await api.post('/filters/admin/filters', filterData);
        toast.success('Filter created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchFilters();
    } catch (error) {
      console.error('Failed to save filter:', error);
      toast.error(error.response?.data?.message || 'Failed to save filter');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/filters/admin/filters/${id}`);
        toast.success('Filter deleted successfully');
        fetchFilters();
      } catch (error) {
        console.error('Failed to delete filter:', error);
        toast.error(error.response?.data?.message || 'Failed to delete filter');
      }
    }
  };

  const openEditModal = (filter) => {
    setEditingFilter(filter);
    setFormData({
      name: filter.name,
      type: filter.type || '',
      lifespan: filter.lifespan || '',
      description: filter.description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      lifespan: '',
      description: ''
    });
    setEditingFilter(null);
  };

  const formatType = (type) => {
    if (!type) return 'Standard';
    return type;
  };

  const filteredFilters = filters.filter(filter =>
    filter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    filter.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading filters...</p>
      </div>
    );
  }

  if (error && filters.length === 0) {
    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Filters Management</h2>
            <p className="text-sm text-gray-500">Manage water filtration system filters</p>
          </div>
        </div>
        
        <div className="bg-red-50 rounded-xl p-8 text-center border border-red-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Filters</h3>
          <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchFilters}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Show initialization screen if no filters found
  if (filters.length === 0) {
    console.log('📭 [FiltersManagement] No filters found, showing initialization screen');
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Filters Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage water filtration system filters</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Droplet className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Filters Found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Your water filters haven't been configured yet. Click the button below to initialize with default filters.
          </p>
          <button
            onClick={initializeFilters}
            disabled={initializing}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {initializing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span>{initializing ? 'Initializing...' : 'Initialize Default Filters'}</span>
          </button>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-gray-600 font-medium mb-2">Default filters to be created:</p>
            <ul className="text-xs text-gray-500 space-y-1 text-left">
              <li>• Sediment Filter - Removes sand, rust, and large particles (90 days)</li>
              <li>• Carbon Filter - Removes chlorine, odors, and organic compounds (90 days)</li>
              <li>• Reverse Osmosis Membrane - Removes dissolved solids and contaminants (180 days)</li>
              <li>• UV Filter - Kills bacteria and viruses (365 days)</li>
              <li>• Alkaline Filter - Adds minerals and balances pH (180 days)</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Filters Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage water filtration system filters</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchFilters}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search filters by name or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Filters Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lifespan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFilters.length > 0 ? (
                filteredFilters.map((filter) => (
                  <tr key={filter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Filter className="w-5 h-5 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{filter.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                        {formatType(filter.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {filter.lifespan ? `${filter.lifespan} days` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {filter.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {filter.createdAt ? new Date(filter.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(filter)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(filter.id, filter.name)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No filters match your search' : 'No filters found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Filter Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingFilter ? 'Edit Filter' : 'Add New Filter'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Sediment Filter, Carbon Filter"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="Sediment">Sediment Filter</option>
                  <option value="Carbon">Carbon Filter</option>
                  <option value="RO">Reverse Osmosis</option>
                  <option value="UV">UV Filter</option>
                  <option value="Alkaline">Alkaline Filter</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lifespan (days)</label>
                <input
                  type="number"
                  value={formData.lifespan}
                  onChange={(e) => setFormData({...formData, lifespan: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 90"
                />
                <p className="text-xs text-gray-500 mt-1">Number of days until filter needs replacement</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Optional description of the filter"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingFilter ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersManagement;