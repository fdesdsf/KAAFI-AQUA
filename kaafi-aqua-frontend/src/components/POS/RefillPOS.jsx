import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Droplets, CreditCard, DollarSign, Phone, Package, Truck, ShoppingCart, Plus, Minus } from 'lucide-react';
import { useSales } from '../../context/SalesContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const RefillPOS = () => {
  const { addSale, getTodayRevenue, refreshSales } = useSales();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Sale type selection
  const [saleType, setSaleType] = useState('RETAIL_REFILL');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  // Product data from API
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [containers, setContainers] = useState([]);
  
  // Current selection for adding to cart
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [bulkPriceOption, setBulkPriceOption] = useState('standard');

  const saleTypes = [
    { code: 'RETAIL_REFILL', name: 'Retail Refill', icon: <Droplets className="w-5 h-5" />, description: 'Customer brings container' },
    { code: 'RETAIL_CONTAINER', name: 'Retail + Container', icon: <Package className="w-5 h-5" />, description: 'New container + water' },
    { code: 'WHOLESALE_PACKAGED', name: 'Wholesale Packaged', icon: <Package className="w-5 h-5" />, description: 'Sealed water cartons' },
    { code: 'WHOLESALE_BULK', name: 'Wholesale Bulk', icon: <Truck className="w-5 h-5" />, description: 'Bulk water for shops' }
  ];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchContainers();
  }, []);

  // Reset selections when sale type changes
  useEffect(() => {
    setSelectedProduct(null);
    setSelectedContainer(null);
    setQuantity(1);
  }, [saleType]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/admin/products');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/admin/product-categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchContainers = async () => {
    try {
      const response = await api.get('/admin/containers');
      if (response.data && response.data.data) {
        const activeContainers = response.data.data.filter(c => {
          const isActive = c.is_active !== undefined ? c.is_active : c.isActive;
          return isActive === true || isActive === 1;
        });
        setContainers(activeContainers);
      }
    } catch (error) {
      console.error('Failed to fetch containers:', error);
      toast.error('Failed to load containers');
    }
  };

  const getProductsByCategory = () => {
    let categoryType = '';
    switch (saleType) {
      case 'RETAIL_REFILL':
      case 'RETAIL_CONTAINER':
        categoryType = 'RETAIL_WATER';
        break;
      case 'WHOLESALE_PACKAGED':
        categoryType = 'WHOLESALE_PACKAGED';
        break;
      case 'WHOLESALE_BULK':
        categoryType = 'WHOLESALE_BULK';
        break;
      default:
        return [];
    }
    
    const targetCategory = categories.find(cat => cat.type === categoryType);
    if (!targetCategory) return [];
    
    let filtered = products.filter(p => p.categoryId === targetCategory.id);
    
    if (saleType === 'WHOLESALE_BULK') {
      filtered = filtered.filter(p => 
        bulkPriceOption === 'standard' ? p.price === 80 : p.price === 100
      );
    }
    
    return filtered;
  };

  const calculateItemTotal = () => {
    let total = 0;
    if (selectedProduct) {
      total += selectedProduct.price * quantity;
    }
    if (saleType === 'RETAIL_CONTAINER' && selectedContainer) {
      total += selectedContainer.price;
    }
    return total;
  };

  const addToCart = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    
    if (saleType === 'RETAIL_CONTAINER' && !selectedContainer) {
      toast.error('Please select a container');
      return;
    }
    
    const cartItem = {
      id: Date.now(),
      saleType,
      product: selectedProduct,
      container: selectedContainer,
      quantity,
      subtotal: calculateItemTotal()
    };
    
    setCart([...cart, cartItem]);
    setSelectedProduct(null);
    setSelectedContainer(null);
    setQuantity(1);
    toast.success('Item added to cart');
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const getSaleTypeId = (code) => {
    const types = {
      'RETAIL_REFILL': 1,
      'RETAIL_CONTAINER': 2,
      'WHOLESALE_PACKAGED': 3,
      'WHOLESALE_BULK': 4
    };
    return types[code];
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    
    if (paymentMethod === 'CREDIT' && !customerPhone.trim()) {
      toast.error('Phone number is required for credit sales');
      return;
    }
    
    setProcessing(true);
    
    try {
      for (const item of cart) {
        const saleData = {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0],
          customer: customerName,
          customerPhone: customerPhone,
          customerId: null,  // Let backend handle customer matching by phone
          size: item.product.size,
          quantity: item.quantity,
          amount: item.subtotal,
          method: paymentMethod,
          status: 'COMPLETED',
          staff: user?.name || 'Staff',
          saleTypeId: getSaleTypeId(item.saleType),
          productId: item.product.id,
          containerId: item.container?.id || null,
          containerCharge: item.container?.price || 0
        };
        
        console.log('📤 Sending sale data:', saleData);
        await addSale(saleData);
      }
      
      toast.success(`Sale complete! Total: KES ${calculateCartTotal()}`);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('CASH');
      await refreshSales();
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error('Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const currentProducts = getProductsByCategory();
  const availableContainers = containers;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-gray-600 mt-1">Process retail and wholesale transactions</p>
      </div>

      {/* Sale Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {saleTypes.map(type => (
          <button
            key={type.code}
            onClick={() => setSaleType(type.code)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              saleType === type.code
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${saleType === type.code ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {type.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{type.name}</p>
                <p className="text-xs text-gray-500">{type.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bulk Price Toggle for Wholesale Bulk */}
      {saleType === 'WHOLESALE_BULK' && (
        <div className="bg-yellow-50 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Bulk Price Option</label>
          <div className="flex space-x-4">
            <button
              onClick={() => setBulkPriceOption('standard')}
              className={`px-4 py-2 rounded-lg font-medium ${
                bulkPriceOption === 'standard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              Standard: KES 80 / 20L
            </button>
            <button
              onClick={() => setBulkPriceOption('premium')}
              className={`px-4 py-2 rounded-lg font-medium ${
                bulkPriceOption === 'premium'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              Premium: KES 100 / 20L
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {saleType === 'RETAIL_REFILL' && 'Water Refill Sizes'}
              {saleType === 'RETAIL_CONTAINER' && 'Select Water Size'}
              {saleType === 'WHOLESALE_PACKAGED' && 'Packaged Water Cartons'}
              {saleType === 'WHOLESALE_BULK' && 'Bulk Water Options'}
            </h3>
            
            {currentProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {currentProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      selectedProduct?.id === product.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{product.size}</p>
                    <p className="text-xs text-gray-500">{product.unit}</p>
                    <p className="text-blue-600 font-bold mt-1">KES {product.price}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Container Selection (for Retail New Container) */}
          {saleType === 'RETAIL_CONTAINER' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Container</h3>
              {availableContainers.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No containers available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {availableContainers.map(container => (
                    <button
                      key={container.id}
                      onClick={() => setSelectedContainer(container)}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        selectedContainer?.id === container.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{container.name}</p>
                      <p className="text-xs text-gray-500">{container.size}</p>
                      <p className="text-blue-600 font-bold mt-1">KES {container.price}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quantity and Add to Cart */}
          {selectedProduct && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center px-3 py-2 border border-gray-300 rounded-lg"
                      min="1"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-500">Item Total</p>
                  <p className="text-2xl font-bold text-blue-600">KES {calculateItemTotal()}</p>
                </div>
              </div>
              
              <button
                onClick={addToCart}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Cart & Payment */}
        <div className="space-y-6">
          {/* Customer Section - Simplified without Find Existing button */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Enter customer name"
              required
            />
            
            {paymentMethod === 'CREDIT' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Enter customer phone number"
                  />
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Required for credit sales - customer will be found/created by phone
                </p>
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span>Cart</span>
              <span className="text-sm text-gray-500">{cart.length} items</span>
            </h3>
            
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.product.name} {item.product.size}
                        </p>
                        {item.container && (
                          <p className="text-xs text-gray-500">+ {item.container.name}</p>
                        )}
                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">KES {item.subtotal}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 text-xs mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">KES {calculateCartTotal()}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-600">KES {calculateCartTotal()}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex items-center justify-center space-x-1 p-2 rounded-lg border-2 ${
                    paymentMethod === 'CASH' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Cash</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('M_PESA')}
                  className={`flex items-center justify-center space-x-1 p-2 rounded-lg border-2 ${
                    paymentMethod === 'M_PESA' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">M-Pesa</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={`flex items-center justify-center space-x-1 p-2 rounded-lg border-2 ${
                    paymentMethod === 'CREDIT' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Credit</span>
                </button>
              </div>
              {paymentMethod === 'CREDIT' && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Credit sales will be added to customer's account
                </p>
              )}
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={processing || cart.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Complete Sale (KES ${calculateCartTotal()})`}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700">Today's Sales</span>
              <span className="text-xl font-bold text-blue-900">KES {getTodayRevenue().toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Staff</span>
              <span className="text-sm font-medium text-blue-900">{user?.name || 'Staff'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefillPOS;