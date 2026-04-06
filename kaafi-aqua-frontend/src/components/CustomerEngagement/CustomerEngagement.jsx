import React, { useState, useEffect } from 'react';
import { Phone, Mail, AlertTriangle, Users, DollarSign, Calendar, Search, RefreshCw, CreditCard, X, UserPlus, Eye, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const CustomerEngagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [processing, setProcessing] = useState(false);
  const [inactiveDays, setInactiveDays] = useState(15);
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [showCreditOnly, setShowCreditOnly] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [customerSales, setCustomerSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = '/customers';
      if (showInactiveOnly) {
        url = `/customers/inactive/${inactiveDays}`;
      } else if (showCreditOnly) {
        url = '/customers/credit';
      }
      const response = await api.get(url);
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerSales = async (customer) => {
    setLoadingSales(true);
    setSelectedCustomer(customer);
    try {
      const response = await api.get(`/customers/${customer.id}/sales`);
      setCustomerSales(response.data.data || []);
      setShowSalesModal(true);
    } catch (error) {
      console.error('Failed to fetch customer sales:', error);
      toast.error('Failed to load sales history');
    } finally {
      setLoadingSales(false);
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/customers/${selectedCustomer.id}/sales/${saleId}`);
      toast.success('Sale deleted successfully');
      const response = await api.get(`/customers/${selectedCustomer.id}/sales`);
      setCustomerSales(response.data.data || []);
      fetchCustomers();
    } catch (error) {
      console.error('Failed to delete sale:', error);
      toast.error(error.response?.data?.message || 'Failed to delete sale');
    }
  };

  // ✅ NEW: Delete Customer
  const handleDeleteCustomer = async (customer) => {
    // Check if customer has any sales
    if (customer.totalRefills > 0) {
      toast.error(`Cannot delete "${customer.name}" because they have ${customer.totalRefills} sale(s). Please delete all sales first.`);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/customers/${customer.id}`);
      toast.success(`Customer "${customer.name}" deleted successfully`);
      fetchCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    setShowInactiveOnly(filter === 'inactive');
    setShowCreditOnly(filter === 'credit');
    setTimeout(() => fetchCustomers(), 0);
  };

  const handleMakeCall = (phone) => {
    if (phone && phone !== 'N/A') {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error('No phone number available');
    }
  };

  const openCreditModal = (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setShowCreditModal(true);
  };

  const handleCreditPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > selectedCustomer.creditBalance) {
      toast.error('Amount exceeds credit balance');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/customers/${selectedCustomer.id}/pay-credit`, { 
        amount: amount,
        paymentMethod: paymentMethod
      });
      toast.success(`Payment of KES ${amount} recorded successfully via ${paymentMethod === 'CASH' ? 'Cash' : 'M-Pesa'}`);
      setShowCreditModal(false);
      fetchCustomers();
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setAddingCustomer(true);
    try {
      await api.post('/customers', {
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        totalRefills: 0,
        totalSpent: 0,
        creditBalance: 0
      });
      
      toast.success(`Customer ${newCustomer.name} added successfully`);
      setShowAddCustomerModal(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to add customer:', error);
      toast.error(error.response?.data?.message || 'Failed to add customer');
    } finally {
      setAddingCustomer(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getInactiveDays = (lastRefillDate) => {
    if (!lastRefillDate) return null;
    const lastDate = new Date(lastRefillDate);
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatMethod = (method) => {
    if (method === 'CASH') return 'Cash';
    if (method === 'M_PESA') return 'M-Pesa';
    if (method === 'CREDIT') return 'Credit';
    return method;
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
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Engagement</h1>
          <p className="text-gray-600 mt-1">Track customer activity, purchases, and manage credit</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span></span>
          </button>
          <button
            onClick={fetchCustomers}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{customers.length}</span>
          </div>
          <p className="text-sm text-gray-600">Total Customers</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">
              {customers.filter(c => {
                const days = getInactiveDays(c.lastRefillDate);
                return days !== null && days > 15;
              }).length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Inactive (over 15 days)</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-8 h-8 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">
              {customers.filter(c => (c.creditBalance || 0) > 0).length}
            </span>
          </div>
          <p className="text-sm text-gray-600">With Credit</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">
              KES {customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600">Total Credit Outstanding</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Customers
            </button>
            <button
              onClick={() => handleFilterChange('inactive')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedFilter === 'inactive' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => handleFilterChange('credit')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedFilter === 'credit' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Has Credit
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchases</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Purchase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const daysInactive = getInactiveDays(customer.lastRefillDate);
                  const isInactive = daysInactive !== null && daysInactive > 15;
                  
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                          {isInactive && (
                            <p className="text-xs text-orange-600 flex items-center mt-1">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Inactive for {daysInactive} days
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900 flex items-center">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {customer.phone || 'N/A'}
                          </p>
                          {customer.email && (
                            <p className="text-xs text-gray-500 flex items-center mt-1">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              {customer.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{customer.totalRefills || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">KES {(customer.totalSpent || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${(customer.creditBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          KES {(customer.creditBalance || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                          {customer.lastRefillDate || 'Never'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {customer.phone && (
                            <button
                              onClick={() => handleMakeCall(customer.phone)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Call Customer"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                          )}
                          {(customer.creditBalance || 0) > 0 && (
                            <button
                              onClick={() => openCreditModal(customer)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => fetchCustomerSales(customer)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Sales"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* ✅ DELETE CUSTOMER BUTTON - ADMIN ONLY */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteCustomer(customer)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <p className="text-gray-500">No customers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Modal */}
      {showSalesModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Sales History</h2>
                <p className="text-sm text-gray-500">Customer: {selectedCustomer.name}</p>
              </div>
              <button onClick={() => setShowSalesModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-x-auto p-6">
              {loadingSales ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : customerSales.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No sales found for this customer</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Size</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Staff</th>
                      {isAdmin && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customerSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.size}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.quantity}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">KES {sale.amount}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            sale.method === 'CREDIT' ? 'bg-purple-100 text-purple-700' :
                            sale.method === 'M_PESA' ? 'bg-green-100 text-green-700' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {formatMethod(sale.method)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            sale.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            sale.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.staff}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Sale"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-100">
              <button
                onClick={() => setShowSalesModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter customer name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={addingCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {addingCustomer ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Payment Modal */}
      {showCreditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Record Credit Payment</h2>
              <button onClick={() => setShowCreditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Customer: <span className="font-medium">{selectedCustomer.name}</span></p>
                <p className="text-sm text-gray-600 mt-1">
                  Outstanding Balance: <span className="font-bold text-red-600">KES {(selectedCustomer.creditBalance || 0).toLocaleString()}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'CASH' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('M_PESA')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === 'M_PESA' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>M-Pesa</span>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount (KES)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                  min="0"
                  step="100"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCreditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreditPayment}
                  disabled={processing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerEngagement;