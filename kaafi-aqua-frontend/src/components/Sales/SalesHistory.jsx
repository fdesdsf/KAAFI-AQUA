import React, { useState, useEffect } from 'react';
import { Search, FileText, FileSpreadsheet, Users, Edit, Trash2, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSales } from '../../context/SalesContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SalesHistory = () => {
  const { sales, refreshSales } = useSales();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(false);
  const [userMap, setUserMap] = useState({});
  const [editingSale, setEditingSale] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customer: '',
    amount: '',
    method: '',
    status: '',
    paidAmount: '',
    remainingBalance: ''
  });
  const navigate = useNavigate();

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  // Only fetch users if admin
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshSales();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const userList = response.data.data;
      const map = {};
      userList.forEach(user => {
        map[user.username] = {
          name: user.name,
          roleDisplay: user.role === 'ADMIN' ? 'Administrator' : 'Sales Staff'
        };
      });
      setUserMap(map);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const getUserInfo = (username) => {
    // For non-admin users, just return the username
    if (!isAdmin) {
      return { name: username, roleDisplay: '' };
    }
    return userMap[username] || { name: username, roleDisplay: '' };
  };

  // Handle Edit Sale
  const handleEditClick = (sale) => {
    setEditingSale(sale);
    setEditFormData({
      customer: sale.customer,
      amount: sale.amount,
      method: sale.method,
      status: sale.status,
      paidAmount: sale.paidAmount || 0,
      remainingBalance: sale.remainingBalance || (sale.status === 'PENDING' ? sale.amount : 0)
    });
    setShowEditModal(true);
  };

  const handleUpdateSale = async () => {
    try {
      setLoading(true);
      const updateData = {
        customer: editFormData.customer,
        amount: parseFloat(editFormData.amount),
        method: editFormData.method,
        status: editFormData.status,
        paidAmount: parseFloat(editFormData.paidAmount || 0),
        remainingBalance: editFormData.status === 'PENDING' 
          ? parseFloat(editFormData.remainingBalance || editFormData.amount)
          : 0
      };

      const response = await api.put(`/sales/admin/${editingSale.id}`, updateData);
      
      if (response.data.success) {
        toast.success('Sale updated successfully!');
        setShowEditModal(false);
        refreshSales();
      } else {
        toast.error(response.data.message || 'Failed to update sale');
      }
    } catch (error) {
      console.error('Update sale error:', error);
      toast.error(error.response?.data?.message || 'Failed to update sale');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Sale
  const handleDeleteClick = async (sale) => {
    if (!window.confirm(`Are you sure you want to delete sale #${sale.id} for ${sale.customer}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/sales/admin/${sale.id}`);
      
      if (response.data.success) {
        toast.success('Sale deleted successfully!');
        refreshSales();
      } else {
        toast.error(response.data.message || 'Failed to delete sale');
      }
    } catch (error) {
      console.error('Delete sale error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete sale');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'all' || 
      (filterMethod === 'Cash' && sale.method === 'CASH') ||
      (filterMethod === 'M-Pesa' && sale.method === 'M_PESA') ||
      (filterMethod === 'Credit' && sale.method === 'CREDIT');
    const matchesStatus = filterStatus === 'all' || sale.status === filterStatus;
    
    const today = new Date();
    const saleDate = new Date(sale.date);
    
    if (dateRange === 'today') {
      return matchesSearch && matchesMethod && matchesStatus && saleDate.toDateString() === today.toDateString();
    } else if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return matchesSearch && matchesMethod && matchesStatus && saleDate >= weekAgo;
    } else if (dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      return matchesSearch && matchesMethod && matchesStatus && saleDate >= monthAgo;
    }
    
    return matchesSearch && matchesMethod && matchesStatus;
  });
  
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
  const totalTransactions = filteredSales.length;
  const pendingAmount = filteredSales
    .filter(sale => sale.status === 'PENDING')
    .reduce((sum, sale) => sum + (sale.amount || 0), 0);
  
  const formatMethod = (method) => {
    if (method === 'CASH') return 'Cash';
    if (method === 'M_PESA') return 'M-Pesa';
    if (method === 'CREDIT') return 'Credit';
    return method;
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  
  const exportToExcel = () => {
    const exportData = filteredSales.map(sale => {
      const userInfo = getUserInfo(sale.staff);
      return {
        'Date': sale.date,
        'Time': sale.time,
        'Customer': sale.customer,
        'Size': sale.size,
        'Quantity': sale.quantity,
        'Amount (KES)': sale.amount,
        'Payment Method': formatMethod(sale.method),
        'Staff Name': userInfo.name,
        'Staff Role': userInfo.roleDisplay,
        'Status': sale.status,
        'Paid Amount (KES)': sale.paidAmount || (sale.status === 'COMPLETED' ? sale.amount : 0),
        'Remaining Balance (KES)': sale.remainingBalance || (sale.status === 'PENDING' ? sale.amount : 0)
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales History');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `sales_history_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported to Excel successfully!');
  };
  
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('KAAFI AQUA - Sales History Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Revenue: KES ${totalRevenue.toLocaleString()}`, 14, 38);
    doc.text(`Total Transactions: ${totalTransactions}`, 14, 46);
    doc.text(`Pending Amount: KES ${pendingAmount.toLocaleString()}`, 14, 54);
    
    const tableData = filteredSales.map(sale => {
      const userInfo = getUserInfo(sale.staff);
      return [
        sale.date,
        sale.time,
        sale.customer,
        sale.size,
        sale.quantity.toString(),
        `KES ${sale.amount}`,
        formatMethod(sale.method),
        userInfo.name,
        userInfo.roleDisplay,
        sale.status
      ];
    });
    
    autoTable(doc, {
      startY: 62,
      head: [['Date', 'Time', 'Customer', 'Size', 'Qty', 'Amount', 'Method', 'Staff', 'Role', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 6 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 15 },
        2: { cellWidth: 28 },
        3: { cellWidth: 10 },
        4: { cellWidth: 8 },
        5: { cellWidth: 18 },
        6: { cellWidth: 15 },
        7: { cellWidth: 25 },
        8: { cellWidth: 18 },
        9: { cellWidth: 12 }
      }
    });
    
    doc.save(`sales_history_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Exported to PDF successfully!');
  };
  
  const getDateRangeLabel = () => {
    switch(dateRange) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'All Time';
    }
  };
  
  return (
    <>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-600 mt-1">View and manage all water refill transactions</p>
          {!isAdmin && (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ You can record payments, but only administrators can edit or delete sales.
            </p>
          )}
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">KES {totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{getDateRangeLabel()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
            <p className="text-xs text-gray-500 mt-1">{getDateRangeLabel()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-600 mb-1">Average Sale</p>
            <p className="text-2xl font-bold text-gray-900">KES {totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0}</p>
            <p className="text-xs text-gray-500 mt-1">Per transaction</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-600 mb-1">Pending Amount</p>
            <p className="text-2xl font-bold text-yellow-600">KES {pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">From credit sales</p>
          </div>
        </div>

        {/* Navigation Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => {
              if (user?.role === 'ADMIN') {
                navigate('/admin/customer-engagement');
              } else {
                navigate('/staff/customer-engagement');
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Customer Engagement</span>
          </button>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="M-Pesa">M-Pesa</option>
              <option value="Credit">Credit</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            
            <div className="flex gap-2">
              <button
                onClick={exportToExcel}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
              
              <button
                onClick={exportToPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => {
                    const userInfo = getUserInfo(sale.staff);
                    return (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {sale.date}<br />
                          <span className="text-xs text-gray-500">{sale.time}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{sale.customer}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{sale.size}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{sale.quantity}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">KES {sale.amount}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            sale.method === 'CREDIT' ? 'bg-purple-100 text-purple-700' :
                            sale.method === 'M_PESA' ? 'bg-green-100 text-green-700' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {formatMethod(sale.method)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{userInfo.name}</div>
                            <div className="text-xs text-gray-500">{userInfo.roleDisplay}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(sale.status)}`}>
                            {sale.status}
                          </span>
                          {sale.status === 'PENDING' && sale.method === 'CREDIT' && (
                            <div className="text-xs text-red-600 mt-1">
                              Balance: KES {sale.remainingBalance || sale.amount}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex space-x-2">
                            {sale.status === 'PENDING' && sale.method === 'CREDIT' && (
                              <button
                                onClick={() => {
                                  if (user?.role === 'ADMIN') {
                                    navigate('/admin/customer-engagement');
                                  } else {
                                    navigate('/staff/customer-engagement');
                                  }
                                }}
                                className="text-green-600 hover:text-green-800"
                                title="Record Payment"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleEditClick(sale)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit Sale"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(sale)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete Sale"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-12">
                      <p className="text-gray-500">No sales found for the selected filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Edit Sale</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editFormData.customer}
                  onChange={(e) => setEditFormData({...editFormData, customer: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
                <input
                  type="number"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={editFormData.method}
                  onChange={(e) => setEditFormData({...editFormData, method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="CASH">Cash</option>
                  <option value="M_PESA">M-Pesa</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              
              {editFormData.method === 'CREDIT' && editFormData.status === 'PENDING' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Balance (KES)</label>
                  <input
                    type="number"
                    value={editFormData.remainingBalance}
                    onChange={(e) => setEditFormData({...editFormData, remainingBalance: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSale}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SalesHistory;