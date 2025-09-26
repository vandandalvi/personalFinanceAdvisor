import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, LineElement, PointElement);

function Dashboard() {
  const [data, setData] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchAiSuggestions();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.post('/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Dashboard data error:', error);
      // Add a delay before redirecting to allow user to see what happened
      setTimeout(() => {
        alert('No transaction data found. Please upload your CSV file first.');
        navigate('/');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSuggestions = async () => {
    try {
      const response = await axios.post('/chat', {
        query: 'Give me 3 quick insights about my spending patterns and top saving opportunities'
      });
      setAiSuggestions(response.data.response);
    } catch (error) {
      console.error('AI suggestions error:', error);
      setAiSuggestions('Unable to generate AI insights at the moment.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing your finances...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No data found. Please upload a CSV file first.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Upload CSV
          </button>
        </div>
      </div>
    );
  }

  const categoryData = {
    labels: data.categories?.map(c => c.category) || [],
    datasets: [{
      label: 'Spending by Category (₹)',
      data: data.categories?.map(c => Math.abs(c.total)) || [],
      backgroundColor: [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
      ],
      borderWidth: 0
    }]
  };

  const monthlyData = {
    labels: data.monthly?.map(m => m.month) || [],
    datasets: [{
      label: 'Monthly Spending (₹)',
      data: data.monthly?.map(m => Math.abs(m.total)) || [],
      backgroundColor: '#3B82F6',
      borderColor: '#1D4ED8',
      borderWidth: 2,
      fill: false,
      tension: 0.4
    }]
  };

  const topMerchantsData = {
    labels: data.topMerchants?.map(m => m.merchant) || [],
    datasets: [{
      label: 'Top Merchants (₹)',
      data: data.topMerchants?.map(m => Math.abs(m.total)) || [],
      backgroundColor: '#10B981',
      borderRadius: 8
    }]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full px-4 py-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/chat')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Chat with AI</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Upload New CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-3 py-6 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-500">Total Spending</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">₹{data.totalSpending?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 4h-12l-1-4z" />
                </svg>
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-500">Categories</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{data.totalCategories || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-500">Avg. Transaction</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">₹{data.avgTransaction?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-500">Transactions</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{data.totalTransactions || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
          {/* Category Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
            <div className="h-64 lg:h-80">
              <Pie data={categoryData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Monthly Line Chart */}
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending Trend</h3>
            <div className="h-64 lg:h-80">
              <Line data={monthlyData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Top Merchants Chart */}
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Merchants</h3>
            <div className="h-64 lg:h-80">
              <Bar data={topMerchantsData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }} />
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
          </div>
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-gray-700 whitespace-pre-wrap">{aiSuggestions}</p>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Ask More Questions</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;