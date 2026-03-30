import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Search, X, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    size: '',
    unit: '',
    price: '',
    isActive: true
  });

  // Default products with category types (not hardcoded IDs)
  const defaultProductsByType = [
    { name: 'Mineral Water', categoryType: 'RETAIL_WATER', size: '1L', unit: 'refill', price: 10.00, isActive: true },
    { name: 'Mineral Water', categoryType: 'RETAIL_WATER', size: '5L', unit: 'refill', price: 30.00, isActive: true },
    { name: 'Mineral Water', categoryType: 'RETAIL_WATER', size: '10L', unit: 'refill', price: 75.00, isActive: true },
    { name: 'Mineral Water', categoryType: 'RETAIL_WATER', size: '18.9L', unit: 'refill', price: 150.00, isActive: true },
    { name: 'Mineral Water', categoryType: 'RETAIL_WATER', size: '20L', unit: 'refill', price: 150.00, isActive: true },
    { name: 'Hard Bottle', categoryType: 'RETAIL_CONTAINER', size: '20L', unit: 'container', price: 1000.00, isActive: true },
    { name: 'PET Re-usable Bottle', categoryType: 'RETAIL_CONTAINER', size: '18.9L', unit: 'container', price: 200.00, isActive: true },
    { name: 'Re-usable Bottle', categoryType: 'RETAIL_CONTAINER', size: '20L', unit: 'container', price: 150.00, isActive: true },
    { name: 'Packaged Water', categoryType: 'WHOLESALE_PACKAGED', size: '500ml x 24', unit: 'carton', price: 280.00, isActive: true },
    { name: 'Packaged Water', categoryType: 'WHOLESALE_PACKAGED', size: '1L x 12', unit: 'carton', price: 280.00, isActive: true },
    { name: 'Packaged Water', categoryType: 'WHOLESALE_PACKAGED', size: '1.5L x 8', unit: 'carton', price: 280.00, isActive: true },
    { name: 'Packaged Water', categoryType: 'WHOLESALE_PACKAGED', size: '5L x 4', unit: 'carton', price: 280.00, isActive: true },
    { name: 'Bulk Refill (Standard)', categoryType: 'WHOLESALE_BULK', size: '20L', unit: 'refill', price: 80.00, isActive: true },
    { name: 'Bulk Refill (Premium)', categoryType: 'WHOLESALE_BULK', size: '20L', unit: 'refill', price: 100.00, isActive: true }
  ];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/products');
      console.log('Products fetched:', response.data.data);
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setError(error.response?.data?.message || 'Failed to load products');
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/admin/product-categories');
      console.log('Categories fetched:', response.data.data);
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const initializeProducts = async () => {
    console.log('🚀 [ProductsManagement] Initializing products dynamically...');
    setInitializing(true);
    setError(null);
    
    try {
      // First, fetch existing categories to get their real IDs
      const categoriesResponse = await api.get('/admin/product-categories');
      const existingCategories = categoriesResponse.data.data || [];
      
      // Map category types to their actual IDs
      const categoryMap = {};
      existingCategories.forEach(cat => {
        categoryMap[cat.type] = cat.id;
      });
      
      // Check if all required categories exist
      const requiredTypes = ['RETAIL_WATER', 'RETAIL_CONTAINER', 'WHOLESALE_PACKAGED', 'WHOLESALE_BULK'];
      const missingTypes = requiredTypes.filter(type => !categoryMap[type]);
      
      if (missingTypes.length > 0) {
        toast.error(`Please initialize categories first. Missing: ${missingTypes.join(', ')}`);
        return;
      }
      
      // Create products with the correct category IDs
      let successCount = 0;
      for (const product of defaultProductsByType) {
        try {
          const productData = {
            name: product.name,
            categoryId: categoryMap[product.categoryType],
            size: product.size,
            unit: product.unit,
            price: product.price,
            isActive: product.isActive
          };
          
          await api.post('/admin/products', productData);
          successCount++;
          console.log(`✅ Created product: ${product.name} - ${product.size} (Category: ${product.categoryType})`);
        } catch (err) {
          console.error(`❌ Failed to create product ${product.name}:`, err);
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} default products created successfully`);
        await fetchProducts(); // Refresh the list
      } else {
        toast.error('Failed to create default products');
      }
    } catch (error) {
      console.error('❌ [ProductsManagement] Failed to initialize products:', error);
      setError(error.response?.data?.message || 'Failed to initialize products');
      toast.error(error.response?.data?.message || 'Failed to initialize products');
    } finally {
      setInitializing(false);
    }
  };

  // Helper function to get category ID from product
  const getProductCategoryId = (product) => {
    if (product.categoryId !== undefined) {
      return product.categoryId;
    }
    if (product.category_id !== undefined) {
      return product.category_id;
    }
    if (product.category && product.category.id) {
      return product.category.id;
    }
    return null;
  };

  // Helper function to get active status from product
  const getProductActiveStatus = (product) => {
    if (product.isActive !== undefined) return product.isActive;
    if (product.is_active !== undefined) return product.is_active;
    return false;
  };

  // Get category name from product
  const getCategoryName = (product) => {
    const categoryId = getProductCategoryId(product);
    
    if (!categories || categories.length === 0) {
      return 'Loading...';
    }
    
    if (!categoryId) {
      return 'No Category';
    }
    
    const numericId = Number(categoryId);
    const category = categories.find(c => Number(c.id) === numericId);
    
    return category ? category.name : `Unknown (ID: ${categoryId})`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMISSION ===');
    console.log('formData before send:', formData);
    
    // Validate
    if (!formData.name || !formData.categoryId || !formData.price) {
      toast.error('Please fill all required fields');
      return;
    }

    // Prepare data for backend
    const productData = {
      name: formData.name,
      categoryId: Number(formData.categoryId),
      size: formData.size || null,
      unit: formData.unit || null,
      price: Number(formData.price),
      isActive: formData.isActive
    };
    
    console.log('Sending to backend:', productData);

    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, productData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/admin/products', productData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/admin/products/${id}`);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const openEditModal = (product) => {
    const categoryId = getProductCategoryId(product);
    const activeStatus = getProductActiveStatus(product);
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: categoryId || '',
      size: product.size || '',
      unit: product.unit || '',
      price: product.price,
      isActive: activeStatus
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      size: '',
      unit: '',
      price: '',
      isActive: true
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(product => {
    const productCategoryId = getProductCategoryId(product);
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || productCategoryId == selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading products...</p>
      </div>
    );
  }

  // Show error state
  if (error && products.length === 0) {
    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Products</h2>
            <p className="text-sm text-gray-500">Manage water products, containers, and wholesale items</p>
          </div>
        </div>
        
        <div className="bg-red-50 rounded-xl p-8 text-center border border-red-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Products</h3>
          <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchProducts}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Show initialization screen if no products found
  if (products.length === 0) {
    console.log('📭 [ProductsManagement] No products found, showing initialization screen');
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500 mt-1">Manage water products, containers, and wholesale items</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Your product catalog hasn't been configured yet. Click the button below to initialize with default products.
          </p>
          <button
            onClick={initializeProducts}
            disabled={initializing}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {initializing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span>{initializing ? 'Initializing...' : 'Initialize Default Products'}</span>
          </button>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-gray-600 font-medium mb-2">Default products to be created:</p>
            <ul className="text-xs text-gray-500 space-y-1 text-left">
              <li>• Mineral Water (5 sizes) - Retail Water</li>
              <li>• Hard Bottle, PET Re-usable Bottle, Re-usable Bottle - Empty Containers</li>
              <li>• Packaged Water (4 sizes) - Packaged Water</li>
              <li>• Bulk Refill (Standard & Premium) - Bulk Water Refill</li>
            </ul>
            <p className="text-xs text-gray-400 mt-2">Note: Categories must be initialized first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500">Manage water products, containers, and wholesale items</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchProducts}
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
            <span>Product</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (KES)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{getCategoryName(product)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.size || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.unit || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">KES {product.price}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getProductActiveStatus(product) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {getProductActiveStatus(product) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
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
                  <td colSpan="7" className="text-center py-12 text-gray-500">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 20L, 500ml x 24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., bottle, carton, refill"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsManagement;