import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import './UploadPage.css';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [detectedBank, setDetectedBank] = useState(null);
  const [fileStructure, setFileStructure] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle demo file from welcome page
  useEffect(() => {
    if (location.state?.demoFile) {
      handleFileSelect(location.state.demoFile);
      if (location.state.bankType) {
        setSelectedBank(location.state.bankType);
      }
    }
  }, [location.state]);

  // Detect bank from CSV structure
  const detectBankFromCSV = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const firstLine = text.split('\n')[0].toLowerCase();
        
        // Check for specific column patterns
        if (firstLine.includes('txn date') && 
            firstLine.includes('value date') && 
            firstLine.includes('ref no./cheque no.')) {
          resolve({ bank: 'sbi', headers: firstLine });
        } else if (firstLine.includes('tran date') && 
                   firstLine.includes('chq/ref number') && 
                   firstLine.includes('withdrawal amt') && 
                   firstLine.includes('deposit amt')) {
          resolve({ bank: 'axis', headers: firstLine });
        } else if (firstLine.includes('date') && 
                   firstLine.includes('particulars') && 
                   !firstLine.includes('tran date') && 
                   !firstLine.includes('txn date')) {
          resolve({ bank: 'kotak', headers: firstLine });
        } else {
          resolve({ bank: null, headers: firstLine });
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setDetectedBank(null);
    setFileStructure(null);
    
    // Detect bank from CSV content
    if (selectedFile && selectedFile.type === 'text/csv') {
      const detection = await detectBankFromCSV(selectedFile);
      setFileStructure(detection);
      setDetectedBank(detection.bank);
      
      // Auto-select the detected bank
      if (detection.bank) {
        setSelectedBank(detection.bank);
      }
    }
  };

  const validateBankSelection = () => {
    if (!file || !selectedBank) {
      return { valid: false, message: 'Please select both a file and your bank.' };
    }

    // Check if we detected a bank from CSV structure
    if (detectedBank && detectedBank !== selectedBank) {
      const bankNames = {
        sbi: 'State Bank of India (SBI)',
        kotak: 'Kotak Mahindra Bank',
        axis: 'Axis Bank'
      };
      
      return {
        valid: false,
        message: `❌ CSV Format Mismatch!\n\nYour CSV file structure matches: ${bankNames[detectedBank]}\nBut you selected: ${bankNames[selectedBank]}\n\nThis will cause parsing errors and incorrect data.\n\nPlease select the correct bank: ${bankNames[detectedBank]}`,
        critical: true
      };
    }

    // Warn if we couldn't detect the bank
    if (!detectedBank) {
      return {
        valid: false,
        message: '⚠️ Warning: Could not automatically detect bank format from CSV structure.\n\nPlease ensure you have selected the correct bank, or the upload may fail.\n\nDo you want to continue?',
        warning: true
      };
    }

    return { valid: true };
  };

  const handleUpload = async () => {
    const validation = validateBankSelection();
    
    if (!validation.valid) {
      if (validation.critical) {
        // Critical error - don't allow to proceed
        alert(validation.message);
        return;
      } else if (validation.warning) {
        // Show confirmation dialog for warning
        const confirmed = window.confirm(validation.message);
        if (!confirmed) {
          return;
        }
      } else {
        alert(validation.message);
        return;
      }
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank', selectedBank);

    try {
      const response = await axios.post(API_ENDPOINTS.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Upload success:', response.data);
      // Add a small delay to ensure backend has processed the file
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Upload failed. ';
      if (error.response?.status === 404) {
        errorMessage += 'Backend not found. Please check if the backend is running.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error: ' + (error.response?.data?.error || 'Internal server error');
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage += 'Cannot connect to backend. Please check your internet connection.';
      } else {
        errorMessage += error.response?.data?.error || error.message || 'Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-content">
          {/* Step Indicator */}
          <div className="steps-indicator">
            <div className={`step-item ${file ? 'completed' : 'active'}`}>
              <div className="step-circle">1</div>
              <span>Upload File</span>
            </div>
            <div className="step-line"></div>
            <div className={`step-item ${selectedBank ? 'completed' : file ? 'active' : ''}`}>
              <div className="step-circle">2</div>
              <span>Select Bank</span>
            </div>
            <div className="step-line"></div>
            <div className={`step-item ${file && selectedBank ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <span>Analyze</span>
            </div>
          </div>

          <div className="upload-box">
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            {file ? (
              <div>
                <p className="file-selected">✓ File Selected</p>
                <p style={{color: '#666', marginTop: '10px'}}>{file.name}</p>
              </div>
            ) : (
              <div>
                <p style={{color: '#666', marginBottom: '20px', fontSize: '1.1rem'}}>
                  Drag and drop your CSV file here, or
                </p>
                <label className="browse-button">
                  Browse Files
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    style={{display: 'none'}}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="bank-selection">
            <h3>Select Your Bank</h3>
            {detectedBank && file && (
              <p style={{
                marginBottom: '10px',
                padding: '10px 12px',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: '1px solid #10b981'
              }}>
                ✅ CSV Structure Detected: <strong>{
                  detectedBank === 'sbi' ? 'State Bank of India (SBI)' :
                  detectedBank === 'kotak' ? 'Kotak Mahindra Bank' :
                  detectedBank === 'axis' ? 'Axis Bank' : ''
                }</strong>
              </p>
            )}
            {!detectedBank && file && (
              <p style={{
                marginBottom: '10px',
                padding: '10px 12px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: '1px solid #fbbf24'
              }}>
                ⚠️ Could not detect bank format. Please select manually.
              </p>
            )}
            {detectedBank && selectedBank && detectedBank !== selectedBank && (
              <p style={{
                marginBottom: '10px',
                padding: '10px 12px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                fontSize: '0.9rem',
                border: '2px solid #ef4444',
                fontWeight: '600'
              }}>
                ❌ MISMATCH ERROR: CSV is <strong>{
                  detectedBank === 'sbi' ? 'SBI' :
                  detectedBank === 'kotak' ? 'Kotak' :
                  detectedBank === 'axis' ? 'Axis' : ''
                }</strong> format, but you selected <strong>{
                  selectedBank === 'sbi' ? 'SBI' :
                  selectedBank === 'kotak' ? 'Kotak' :
                  selectedBank === 'axis' ? 'Axis' : ''
                }</strong>!
              </p>
            )}
            <div className="bank-grid">
              {[
                { id: 'sbi', name: 'State Bank of India', logo: '🏦', format: 'SBI Statement Format' },
                { id: 'kotak', name: 'Kotak Mahindra Bank', logo: '🏛️', format: 'Kotak CSV Format' },
                { id: 'axis', name: 'Axis Bank', logo: '🏢', format: 'Axis Statement Format' }
              ].map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`bank-button ${selectedBank === bank.id ? 'selected' : ''}`}
                >
                  <div className="bank-icon">{bank.logo}</div>
                  <div className="bank-name">{bank.name}</div>
                  <div className="bank-format">{bank.format}</div>
                </button>
              ))}
            </div>
          </div>

          {file && selectedBank && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="upload-button"
            >
              {uploading ? (
                <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <span className="spinner"></span>
                  Uploading...
                </span>
              ) : (
                'Analyze My Finances'
              )}
            </button>
          )}

          <div className="features">
            <div className="feature-item">Upload your bank's CSV statement</div>
            <div className="feature-item">Select correct bank for smart parsing</div>
            <div className="feature-item">Get AI-powered financial insights</div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;