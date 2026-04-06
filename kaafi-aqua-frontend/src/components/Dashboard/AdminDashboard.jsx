import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Droplets, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle,
  Package,
  Calendar,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  PieChart as PieChartIcon,
  X,
  Filter,
  TrendingDown,
  Activity,
  Wallet
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    tankLevel: 2850,
    tankCapacity: 5000,
    tankPercentage: 57,
    tankStatus: 'Good',
    activeUsers: 0,
    totalSales: 0,
    inventoryValue: 0,
    lowStockItems: 0,
    todayProfit: 0,
    todayExpenses: 0,
    isProfit: true
  });
  
  const [recentSales, setRecentSales] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [salesBySize, setSalesBySize] = useState([]);
  
  // Profit Details Modal State
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [profitPeriod, setProfitPeriod] = useState('daily');
  const [profitDetails, setProfitDetails] = useState(null);
  const [profitLoading, setProfitLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/admin');
      const data = response.data.data;
      
      // Get the actual tank level and capacity from backend
      const tankLevel = data.tankLevel || 2850;
      const tankCapacity = data.tankCapacity || 5000;
      
      // Calculate percentage manually (this ensures it's always correct)
      const calculatedPercentage = tankCapacity > 0 ? (tankLevel / tankCapacity) * 100 : 0;
      
      // Determine status based on calculated percentage
      let tankStatus = 'Good';
      if (calculatedPercentage < 20) {
        tankStatus = 'Critical - Restock Needed';
      } else if (calculatedPercentage < 40) {
        tankStatus = 'Low';
      } else if (calculatedPercentage > 90) {
        tankStatus = 'Full';
      } else {
        tankStatus = 'Good';
      }
      
      setStats({
        todaySales: data.todaySales || 0,
        todayRevenue: data.todayRevenue || 0,
        weeklyRevenue: data.weeklyRevenue || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        tankLevel: tankLevel,
        tankCapacity: tankCapacity,
        tankPercentage: calculatedPercentage,
        tankStatus: tankStatus,
        activeUsers: data.activeUsers || 0,
        totalSales: data.totalSales || 0,
        inventoryValue: data.inventoryValue || 0,
        lowStockItems: data.lowStockItems || 0,
        todayProfit: data.todayProfit || 0,
        todayExpenses: data.todayExpenses || 0,
        isProfit: data.isProfit !== undefined ? data.isProfit : true
      });
      
      setRecentSales(data.recentSales || []);
      
      if (data.salesBySize) {
        const sizeData = Object.entries(data.salesBySize).map(([size, count]) => ({
          size: size,
          sales: count
        }));
        setSalesBySize(sizeData);
      }
      
      if (data.weeklySales && data.weeklySales.length > 0) {
        setSalesData(data.weeklySales);
      } else {
        setSalesData([
          { day: 'Mon', sales: 320 },
          { day: 'Tue', sales: 450 },
          { day: 'Wed', sales: 380 },
          { day: 'Thu', sales: 520 },
          { day: 'Fri', sales: 480 },
          { day: 'Sat', sales: 610 },
          { day: 'Sun', sales: 430 },
        ]);
      }
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProfitDetails = async (period) => {
    setProfitLoading(true);
    try {
      const response = await api.get(`/dashboard/profit-details?period=${period}`);
      setProfitDetails(response.data.data);
    } catch (error) {
      console.error('Failed to fetch profit details:', error);
      toast.error('Failed to load profit details');
    } finally {
      setProfitLoading(false);
    }
  };
  
  const handleProfitCardClick = () => {
    setIsProfitModalOpen(true);
    fetchProfitDetails(profitPeriod);
  };
  
  const handlePeriodChange = (newPeriod) => {
    setProfitPeriod(newPeriod);
    fetchProfitDetails(newPeriod);
  };
  
  const handleRestock = async () => {
    try {
      await api.post('/tank/restock', { amountLiters: stats.tankCapacity - stats.tankLevel });
      toast.success('Tank restocked successfully!');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restock tank');
    }
  };
  
  const tankPercentage = stats.tankPercentage;
  const isProfitPositive = stats.isProfit;
  
  // Colors for charts
  const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];
  
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'Admin'}!</h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your water business today.</p>
      </div>
      
      {/* Stats Grid - 5 columns on extra large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">KES {Number(stats.todayRevenue).toLocaleString()}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Today's Revenue</h3>
          <p className="text-xs text-green-600 mt-2 flex items-center">
            <ArrowUp className="w-3 h-3 mr-1" /> +12% from yesterday
          </p>
        </div>
        
        {/* Sales Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.todaySales}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Today's Sales</h3>
          <p className="text-xs text-gray-500 mt-2">{stats.totalSales} total sales this month</p>
        </div>
        
        {/* Tank Level Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-500 p-3 rounded-lg">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{Math.round(tankPercentage)}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Tank Level</h3>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${tankPercentage < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, tankPercentage))}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.tankLevel}L / {stats.tankCapacity}L</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">Status: {stats.tankStatus}</p>
        </div>
        
        {/* Staff Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.activeUsers}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Active Staff</h3>
          <p className="text-xs text-gray-500 mt-2">Inventory: KES {Number(stats.inventoryValue).toLocaleString()}</p>
        </div>
        
        {/* NEW: Profit/Loss Card */}
        <div 
          onClick={handleProfitCardClick}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-gray-50 rounded-bl-full opacity-50"></div>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${isProfitPositive ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {isProfitPositive ? (
                <Wallet className="w-6 h-6 text-white" />
              ) : (
                <TrendingDown className="w-6 h-6 text-white" />
              )}
            </div>
            <span className={`text-2xl font-bold ${isProfitPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              KES {Math.abs(Number(stats.todayProfit)).toLocaleString()}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Net Profit/Loss</h3>
          <div className="mt-2">
            <p className={`text-xs flex items-center ${isProfitPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {isProfitPositive ? (
                <>
                  <ArrowUp className="w-3 h-3 mr-1" /> Profit
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3 mr-1" /> Loss
                </>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">Expenses: KES {Number(stats.todayExpenses).toLocaleString()}</p>
          </div>
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-blue-600 font-medium">Click for details →</span>
          </div>
        </div>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Weekly Sales Trend</h2>
            <RefreshCw onClick={fetchDashboardData} className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sales by Volume</h2>
            <Package className="w-4 h-4 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesBySize.length > 0 ? salesBySize : [
              { size: '5L', sales: 0 },
              { size: '10L', sales: 0 },
              { size: '18.9L', sales: 0 },
              { size: '20L', sales: 0 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="size" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Recent Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.date}<br />
                      <span className="text-xs text-gray-500">{sale.time}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{sale.customer}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{sale.size}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">KES {sale.amount}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${sale.method === 'M-Pesa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {sale.method}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-500">
                    No recent sales found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Low Stock Alert */}
      {tankPercentage < 20 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-red-800">Low Water Level Alert!</p>
              <p className="text-xs text-red-600">Tank is at {Math.round(tankPercentage)}% capacity. Please restock soon.</p>
            </div>
          </div>
          <button 
            onClick={handleRestock}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Restock Now
          </button>
        </div>
      )}
      
      {/* Profit/Loss Details Modal */}
      {isProfitModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsProfitModalOpen(false)}
            ></div>
            
            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <PieChartIcon className="w-6 h-6 text-white mr-3" />
                  <h3 className="text-lg font-semibold text-white">Profit & Loss Analysis</h3>
                </div>
                <button 
                  onClick={() => setIsProfitModalOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Period Filter */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 mr-4">Filter by Period:</span>
                  <div className="flex space-x-2">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
                      <button
                        key={period}
                        onClick={() => handlePeriodChange(period)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                          profitPeriod === period 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                {profitLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading details...</span>
                  </div>
                ) : profitDetails ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-emerald-700">Total Revenue</span>
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-800">
                          KES {Number(profitDetails.summary?.totalRevenue || 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-red-700">Total Expenses</span>
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-red-800">
                          KES {Number(profitDetails.summary?.totalExpenses || 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className={`rounded-xl p-4 border ${
                        (profitDetails.summary?.netProfit || 0) >= 0 
                          ? 'bg-emerald-50 border-emerald-100' 
                          : 'bg-red-50 border-red-100'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${
                            (profitDetails.summary?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            Net {(profitDetails.summary?.netProfit || 0) >= 0 ? 'Profit' : 'Loss'}
                          </span>
                          <Activity className={`w-5 h-5 ${
                            (profitDetails.summary?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`} />
                        </div>
                        <p className={`text-2xl font-bold ${
                          (profitDetails.summary?.netProfit || 0) >= 0 ? 'text-emerald-800' : 'text-red-800'
                        }`}>
                          KES {Math.abs(Number(profitDetails.summary?.netProfit || 0)).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Margin: {profitDetails.summary?.profitMargin || 0}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Expense Breakdown Pie Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Expense Breakdown by Category</h4>
                        {profitDetails.expenseBreakdown && profitDetails.expenseBreakdown.length > 0 ? (
                          <>
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={profitDetails.expenseBreakdown}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                  nameKey="name"
                                >
                                  {profitDetails.expenseBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => `KES ${Number(value).toLocaleString()}`} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                              {profitDetails.expenseBreakdown.map((entry, index) => (
                                <div key={entry.name} className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-1" 
                                    style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                                  ></div>
                                  <span className="text-xs text-gray-600">{entry.name}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="h-[250px] flex items-center justify-center text-gray-500">
                            No expense data available
                          </div>
                        )}
                      </div>
                      
                      {/* Summary Stats */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Financial Summary</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Revenue Items</span>
                            <span className="text-sm font-bold text-gray-900">
                              {profitDetails.revenues?.length || 0} transactions
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Expense Items</span>
                            <span className="text-sm font-bold text-gray-900">
                              {profitDetails.expenses?.length || 0} transactions
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-blue-800">Net Position</span>
                            <span className={`text-sm font-bold ${
                              (profitDetails.summary?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {(profitDetails.summary?.netProfit || 0) >= 0 ? '+' : '-'} 
                              KES {Math.abs(Number(profitDetails.summary?.netProfit || 0)).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Profit Margin</span>
                            <span className="text-sm font-bold text-gray-900">
                              {profitDetails.summary?.profitMargin || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detailed Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Revenue Table */}
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                          <h4 className="text-sm font-semibold text-emerald-900 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Revenue Details
                          </h4>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {profitDetails.revenues?.length > 0 ? (
                                profitDetails.revenues.map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      <div>{item.description}</div>
                                      <span className="text-xs text-gray-500">{item.source}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-emerald-600 text-right">
                                      +KES {Number(item.amount).toLocaleString()}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="3" className="text-center py-4 text-gray-500 text-sm">
                                    No revenue data available
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {/* Expenses Table */}
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                          <h4 className="text-sm font-semibold text-red-900 flex items-center">
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Expense Details
                          </h4>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {profitDetails.expenses?.length > 0 ? (
                                profitDetails.expenses.map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                        {item.category}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">
                                      -KES {Number(item.amount).toLocaleString()}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="text-center py-4 text-gray-500 text-sm">
                                    No expense data available
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No data available
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setIsProfitModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;