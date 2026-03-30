import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, Search, X, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const CategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: ''
  });

  // Default categories to initialize if none exist
  const defaultCategories = [
    { name: 'Retail Water', type: 'RETAIL_WATER', description: 'Bottled water for retail customers' },
    { name: 'Empty Containers', type: 'RETAIL_CONTAINER', description: 'Empty water containers and bottles' },
    { name: 'Packaged Water', type: 'WHOLESALE_PACKAGED', description: 'Packaged water for wholesale' },
    { name: 'Bulk Water Refill', type: 'WHOLESALE_BULK', description: 'Bulk water refill services' }
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    console.log('🔍 [CategoriesManagement] Fetching categories from API...');
    
    try {
      const response = await api.get('/admin/product-categories');
      console.log('✅ [CategoriesManagement] API Response:', response.data);
      
      if (response.data && response.data.data) {
        if (response.data.data.length > 0) {
          console.log(`✅ [CategoriesManagement] Found ${response.data.data.length} categories`);
          setCategories(response.data.data);
        } else {
          console.warn('⚠️ [CategoriesManagement] Categories array is empty');
          setCategories([]);
        }
      } else {
        console.warn('⚠️ [CategoriesManagement] No data property in response');
        setCategories([]);
      }
    } catch (error) {
      console.error('❌ [CategoriesManagement] Failed to fetch categories:', error);
      setError(error.response?.data?.message || 'Failed to load categories');
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const initializeCategories = async () => {
    console.log('🚀 [CategoriesManagement] Initializing categories with defaults:', defaultCategories);
    setInitializing(true);
    setError(null);
    
    try {
      // Create each default category
      let successCount = 0;
      for (const category of defaultCategories) {
        try {
          await api.post('/admin/product-categories', category);
          successCount++;
          console.log(`✅ Created category: ${category.name}`);
        } catch (err) {
          console.error(`❌ Failed to create category ${category.name}:`, err);
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} default categories created successfully`);
        await fetchCategories(); // Refresh the list
      } else {
        toast.error('Failed to create default categories');
      }
    } catch (error) {
      console.error('❌ [CategoriesManagement] Failed to initialize categories:', error);
      setError(error.response?.data?.message || 'Failed to initialize categories');
      toast.error(error.response?.data?.message || 'Failed to initialize categories');
    } finally {
      setInitializing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type) {
      toast.error('Category name and type are required');
      return;
    }

    const categoryData = {
      name: formData.name,
      type: formData.type,
      description: formData.description || null
    };

    try {
      if (editingCategory) {
        await api.put(`/admin/product-categories/${editingCategory.id}`, categoryData);
        toast.success('Category updated successfully');
      } else {
        await api.post('/admin/product-categories', categoryData);
        toast.success('Category created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/admin/product-categories/${id}`);
        toast.success('Category deleted successfully');
        fetchCategories();
      } catch (error) {
        console.error('Failed to delete category:', error);
        toast.error(error.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      description: category.description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: ''
    });
    setEditingCategory(null);
  };

  const formatType = (type) => {
    if (!type) return '-';
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredCategories = categories.filter(category =>
    category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading categories...</p>
      </div>
    );
  }

  // Show error state
  if (error && categories.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Product Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Manage product categories for your water products</p>
        </div>
        
        <div className="bg-red-50 rounded-xl p-8 text-center border border-red-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Categories</h3>
          <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchCategories}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Show initialization screen if no categories found
  if (categories.length === 0) {
    console.log('📭 [CategoriesManagement] No categories found, showing initialization screen');
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Product Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Manage product categories for your water products</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderTree className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Categories Found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Your product categories haven't been configured yet. Click the button below to initialize with default categories.
          </p>
          <button
            onClick={initializeCategories}
            disabled={initializing}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {initializing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span>{initializing ? 'Initializing...' : 'Initialize Default Categories'}</span>
          </button>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-gray-600 font-medium mb-2">Default categories to be created:</p>
            <ul className="text-xs text-gray-500 space-y-1 text-left">
              <li>• Retail Water (RETAIL_WATER)</li>
              <li>• Empty Containers (RETAIL_CONTAINER)</li>
              <li>• Packaged Water (WHOLESALE_PACKAGED)</li>
              <li>• Bulk Water Refill (WHOLESALE_BULK)</li>
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
          <h2 className="text-xl font-semibold text-gray-900">Product Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Manage product categories for your water products</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchCategories}
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
            <span>Category</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search categories by name or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FolderTree className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                        {formatType(category.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {category.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id, category.name)}
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
                  <td colSpan="5" className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No categories match your search' : 'No categories found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Premium Bottled Water, 20L Container"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="RETAIL_WATER">Retail Water</option>
                  <option value="RETAIL_CONTAINER">Retail Container</option>
                  <option value="WHOLESALE_PACKAGED">Wholesale Packaged</option>
                  <option value="WHOLESALE_BULK">Wholesale Bulk</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Optional description of the category"
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
                  <span>{editingCategory ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesManagement;