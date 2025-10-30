


import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomePage from './components/WelcomePage';
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import ChatPage from './components/ChatPage';
import AdvancedAnalytics from './components/AdvancedAnalytics';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
      </Routes>
    </Router>
  );
}

export default App;