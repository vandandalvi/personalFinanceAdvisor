import React from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomePage.css';

const WelcomePage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/upload');
  };

  const handleTryDemo = async () => {
    try {
      // Fetch the demo CSV file
      const response = await fetch('/kotak_sample.csv');
      const csvText = await response.text();
      
      // Create a blob and file object
      const blob = new Blob([csvText], { type: 'text/csv' });
      const file = new File([blob], 'kotak_sample.csv', { type: 'text/csv' });
      
      // Navigate to upload page with demo file
      navigate('/upload', { state: { demoFile: file, bankType: 'kotak' } });
    } catch (error) {
      console.error('Error loading demo file:', error);
      alert('Failed to load demo file. Please try manual upload.');
      navigate('/upload');
    }
  };

  const handleViewDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="welcome-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">AI-Powered Finance</div>
          <h1 className="hero-title">
            Personal Finance <span className="gradient-text">Manager</span>
          </h1>
          <p className="hero-subtitle">
            Take control of your finances with intelligent insights, automated categorization, 
            and AI-powered analysis. Upload your bank statements and get instant visibility.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={handleGetStarted}>
              <span>Get Started</span>
              <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button className="btn-secondary" onClick={handleTryDemo}>
              <svg className="btn-icon-left" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Try Demo
            </button>
          </div>
        </div>
        <div className="hero-visual">
            <div className="visual-card card-3">
            <div className="card-icon">🤖</div>
            <div className="card-label">Ask,plan,chat about you spendings with financial</div>
          </div>
          <div className="visual-card card-2">
            <div className="card-icon">📊</div>
            <div className="card-label">Visual Analytics & AI Insights</div>
          </div>
          <div className="visual-card card-1">
            <div className="card-icon">💰</div>
            <div className="card-label">Smart Categorization</div>
          </div>
        </div>
      </section>

      {/* Why Use This App Section */}
      <section className="why-section">
        <div className="why-content">
          <h2 className="section-title">Why Choose Our Finance Manager?</h2>
          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon">⚡</div>
              <h3>Save Time & Effort</h3>
              <p>Stop manually tracking expenses in spreadsheets. Upload your bank statement once and get instant insights in seconds.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">💡</div>
              <h3>Make Better Financial Decisions</h3>
              <p>AI-powered insights help you identify spending patterns, find savings opportunities, and plan your budget effectively.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">🎯</div>
              <h3>Track Your Investments</h3>
              <p>Dedicated investment tracking for stocks, mutual funds, and trading accounts. See your portfolio at a glance.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">📊</div>
              <h3>Visual Financial Health</h3>
              <p>Beautiful charts and graphs make it easy to understand where your money goes and track spending trends over time.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">🔐</div>
              <h3>100% Private & Secure</h3>
              <p>Your financial data never leaves your browser session. No cloud storage, no data sharing, complete privacy guaranteed.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">🤝</div>
              <h3>Works With Your Bank</h3>
              <p>Compatible with major Indian banks including SBI, Kotak, Axis, and more. Just export your statement and upload.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Powerful Features at Your Fingertips</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🏦</div>
            <h3>Multi-Bank Support</h3>
            <p>Upload statements from SBI, Kotak, Axis Bank and more. Automatic format detection.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Smart Categorization</h3>
            <p>Automatic transaction categorization using intelligent algorithms. Investment, Food, Shopping, and more.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Visual Analytics</h3>
            <p>Interactive charts and graphs to understand spending patterns, trends, and insights.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>AI Chat Assistant</h3>
            <p>Ask questions about your finances and get personalized insights powered by Google Gemini AI.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Private</h3>
            <p>Your data stays in your session. No cloud storage, complete privacy guaranteed.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Mobile First</h3>
            <p>Fully responsive design. Manage finances on any device - phone, tablet, or desktop.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Upload Statement</h3>
            <p>Upload your bank statement CSV file or try our demo</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Auto Analysis</h3>
            <p>AI categorizes and analyzes your transactions</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Get Insights</h3>
            <p>View charts, trends, and chat with AI assistant</p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="demo-section">
        <div className="demo-content">
          <h2>Try it Right Now</h2>
          <p>Not sure how it works? Try our demo with sample data from Kotak Bank</p>
          <div className="demo-features">
            <div className="demo-feature">
              <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>130+ sample transactions</span>
            </div>
            <div className="demo-feature">
              <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Multiple categories covered</span>
            </div>
            <div className="demo-feature">
              <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Real-world spending patterns</span>
            </div>
          </div>
          <button className="btn-demo" onClick={handleTryDemo}>
            Launch Demo
          </button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Take Control?</h2>
        <p>Start managing your finances smarter, not harder</p>
        <button className="btn-cta" onClick={handleGetStarted}>
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer className="welcome-footer">
        <p>Built with Love</p>
        <p className="footer-subtitle">© 2025 vandan.services All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default WelcomePage;
