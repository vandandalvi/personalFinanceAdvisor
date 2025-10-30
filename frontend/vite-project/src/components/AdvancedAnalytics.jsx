import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import { API_ENDPOINTS } from '../config/api';
import './AdvancedAnalytics.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, LineElement, PointElement);

function AdvancedAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, []);

  const fetchAdvancedAnalytics = async () => {
    try {
      const response = await axios.post(API_ENDPOINTS.advancedAnalytics);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Advanced analytics error:', error);
      setTimeout(() => {
        alert('Unable to load analytics. Please upload your CSV file first.');
        navigate('/');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Analyzing your financial data...</p>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="error-container">
        <p>No analytics data available. Please upload a CSV file first.</p>
        <button onClick={() => navigate('/')} className="upload-button">
          Upload CSV
        </button>
      </div>
    );
  }

  // Prepare chart data
  const categoryTrendData = {
    labels: analyticsData.categoryTrends?.map(ct => ct.category) || [],
    datasets: [
      {
        label: 'Average Spending (₹)',
        data: analyticsData.categoryTrends?.map(ct => ct.avg) || [],
        backgroundColor: '#3B82F6',
      },
      {
        label: 'Median Spending (₹)',
        data: analyticsData.categoryTrends?.map(ct => ct.median) || [],
        backgroundColor: '#10B981',
      }
    ]
  };

  const weekdaySpendingData = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [{
      label: 'Spending by Day of Week (₹)',
      data: analyticsData.weekdaySpending || [],
      backgroundColor: '#8B5CF6',
      borderRadius: 8
    }]
  };

  const hourlySpendingData = {
    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Spending by Hour (₹)',
      data: analyticsData.hourlySpending || [],
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  return (
    <div className="advanced-analytics-page">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="icon-container analytics-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1>Advanced Data Analytics</h1>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Dashboard
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Upload New CSV
            </button>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        {/* Statistical Summary */}
        <div className="stats-section">
          <h2 className="section-title">📊 Statistical Summary</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">📈</div>
              <div className="stat-details">
                <p className="stat-label">Mean Spending</p>
                <p className="stat-value">₹{analyticsData.statistics?.mean?.toFixed(2) || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">📊</div>
              <div className="stat-details">
                <p className="stat-label">Median Spending</p>
                <p className="stat-value">₹{analyticsData.statistics?.median?.toFixed(2) || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">📉</div>
              <div className="stat-details">
                <p className="stat-label">Std Deviation</p>
                <p className="stat-value">₹{analyticsData.statistics?.std?.toFixed(2) || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">🔢</div>
              <div className="stat-details">
                <p className="stat-label">Data Points</p>
                <p className="stat-value">{analyticsData.statistics?.count || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Outliers and Anomalies */}
        <div className="outliers-section">
          <h2 className="section-title">⚠️ Unusual Transactions (Outliers)</h2>
          <div className="outliers-grid">
            {analyticsData.outliers && analyticsData.outliers.length > 0 ? (
              analyticsData.outliers.map((outlier, index) => (
                <div key={index} className="outlier-card">
                  <div className="outlier-header">
                    <span className="outlier-badge">Outlier</span>
                    <span className="outlier-amount">₹{Math.abs(outlier.amount).toFixed(2)}</span>
                  </div>
                  <p className="outlier-description">{outlier.description}</p>
                  <div className="outlier-meta">
                    <span>📅 {outlier.date}</span>
                    <span>🏷️ {outlier.category}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No unusual transactions detected. Your spending is consistent!</p>
            )}
          </div>
        </div>

        {/* Spending Patterns */}
        <div className="patterns-section">
          <h2 className="section-title">🔍 Spending Patterns</h2>
          <div className="charts-grid">
            {/* Category Trends */}
            <div className="chart-container">
              <h3 className="chart-title">Category Statistics</h3>
              <div className="chart-wrapper">
                <Bar 
                  data={categoryTrendData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } }
                  }} 
                />
              </div>
            </div>

            {/* Weekday Spending */}
            <div className="chart-container">
              <h3 className="chart-title">Spending by Day of Week</h3>
              <div className="chart-wrapper">
                <Bar 
                  data={weekdaySpendingData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </div>
            </div>

            {/* Hourly Spending */}
            <div className="chart-container full-width">
              <h3 className="chart-title">Spending by Time of Day</h3>
              <div className="chart-wrapper">
                <Line 
                  data={hourlySpendingData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Frequency Analysis */}
        <div className="frequency-section">
          <h2 className="section-title">🔁 Transaction Frequency</h2>
          <div className="frequency-grid">
            {analyticsData.frequentMerchants && analyticsData.frequentMerchants.map((merchant, index) => (
              <div key={index} className="frequency-card">
                <div className="frequency-header">
                  <span className="merchant-name">{merchant.merchant}</span>
                  <span className="transaction-count">{merchant.count}x</span>
                </div>
                <div className="frequency-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">₹{merchant.total.toFixed(2)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg:</span>
                    <span className="stat-value">₹{merchant.avg.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Quality */}
        <div className="quality-section">
          <h2 className="section-title">✅ Data Quality Report</h2>
          <div className="quality-grid">
            <div className="quality-card">
              <div className="quality-icon success">✓</div>
              <div className="quality-details">
                <p className="quality-label">Total Records</p>
                <p className="quality-value">{analyticsData.dataQuality?.total || 0}</p>
              </div>
            </div>
            <div className="quality-card">
              <div className="quality-icon warning">⚠</div>
              <div className="quality-details">
                <p className="quality-label">Missing Values</p>
                <p className="quality-value">{analyticsData.dataQuality?.missing || 0}</p>
              </div>
            </div>
            <div className="quality-card">
              <div className="quality-icon info">ℹ</div>
              <div className="quality-details">
                <p className="quality-label">Duplicate Entries</p>
                <p className="quality-value">{analyticsData.dataQuality?.duplicates || 0}</p>
              </div>
            </div>
            <div className="quality-card">
              <div className="quality-icon success">✓</div>
              <div className="quality-details">
                <p className="quality-label">Data Completeness</p>
                <p className="quality-value">{analyticsData.dataQuality?.completeness || 100}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Insights Summary */}
        <div className="insights-section">
          <h2 className="section-title">💡 Key Insights</h2>
          <div className="insights-list">
            {analyticsData.insights && analyticsData.insights.map((insight, index) => (
              <div key={index} className="insight-card">
                <div className="insight-icon">{insight.icon}</div>
                <div className="insight-content">
                  <h4 className="insight-title">{insight.title}</h4>
                  <p className="insight-text">{insight.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedAnalytics;