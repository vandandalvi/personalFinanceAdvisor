import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Upload success:', response.data);
      // Add a small delay to ensure backend has processed the file
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
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
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 lg:p-8 xl:p-12">
      <div className="w-full h-full">
        <div className="w-full">
          <div className="text-center mb-8 lg:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-indigo-600 text-white rounded-full mb-6">
              <svg className="w-8 h-8 lg:w-10 lg:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4">Personal Finance Manager</h1>
            <p className="text-gray-600 text-xl lg:text-2xl">Upload your transaction CSV to get AI-powered insights</p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 lg:p-12 xl:p-16 w-full">
          <div
            className={`border-2 border-dashed rounded-xl p-12 lg:p-16 xl:p-20 text-center transition-colors ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 hover:border-indigo-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <svg className="w-20 h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 text-gray-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            {file ? (
              <div>
                <p className="text-green-600 font-medium mb-3 text-lg lg:text-xl">✓ File Selected</p>
                <p className="text-gray-600 text-lg lg:text-xl">{file.name}</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-6 text-lg lg:text-xl xl:text-2xl">Drag and drop your CSV file here, or</p>
                <label className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white text-lg lg:text-xl rounded-xl hover:bg-indigo-700 cursor-pointer transition-colors shadow-lg">
                  <span>Browse Files</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {file && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-lg lg:text-xl rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Analyze My Finances'
              )}
            </button>
          )}

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm lg:text-base text-gray-500">
            <div className="flex items-center">
              <span className="text-indigo-600 mr-2">•</span>
              CSV should include: Date, Description, Category, Amount
            </div>
            <div className="flex items-center">
              <span className="text-indigo-600 mr-2">•</span>
              Amount should be in Indian Rupees (INR)
            </div>
            <div className="flex items-center">
              <span className="text-indigo-600 mr-2">•</span>
              File size limit: 10MB
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default UploadPage;