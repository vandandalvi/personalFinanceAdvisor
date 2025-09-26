# Personal Finance Manager

A modern AI-powered personal finance assistant built with React, Flask, and Gemini AI.

## Features

- 🤖 **AI-Powered Analysis**: Uses Google Gemini AI to provide personalized financial insights
- 📊 **CSV Upload**: Easy transaction data import from your bank statements
- 💰 **Savings Suggestions**: Get specific, actionable advice on where to save money
- 🎨 **Modern UI**: Clean, responsive chat interface with professional design
- 🔍 **Smart Analysis**: Identifies spending patterns, expensive merchants, and subscription services
- 💱 **Currency Support**: Displays amounts in Indian Rupees (₹/Rs)

## Tech Stack

### Frontend
- React 18
- Vite (development server)
- Tailwind CSS (styling)
- Axios (HTTP client)

### Backend
- Flask (Python web framework)
- Flask-CORS (cross-origin requests)
- Pandas (data processing)
- OpenAI client (Gemini API integration)
- Python-dotenv (environment variables)

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Gemini API key from Google AI Studio

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/personalFinanceManager.git
   cd personalFinanceManager
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   
   pip install flask flask-cors pandas python-dotenv openai
   ```

3. **Environment Configuration**
   Create a `.env` file in the `backend` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ANSWER_MODE=ai-only
   CSV_CONTEXT_MAX_CHARS=120000
   ```

4. **Frontend Setup**
   ```bash
   cd frontend/vite-project
   npm install
   ```

### Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   python app.py
   ```
   Backend runs on `http://127.0.0.1:5000`

2. **Start the Frontend**
   ```bash
   cd frontend/vite-project
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

## Usage

1. **Upload CSV**: Click "Upload CSV" and select your bank transaction file
2. **Ask Questions**: Use the chat interface to ask about your spending
3. **Get Insights**: Receive AI-powered analysis and savings suggestions

### Sample Questions
- "Where can I save money?"
- "What did I spend on food?"
- "Show my highest transaction"
- "How much did I spend in September?"

### CSV Format
Your CSV should include columns for:
- Date (transaction date)
- Description (merchant/item name)
- Category (spending category)
- Amount (transaction amount in INR)

## Features in Detail

### AI Analysis
- Identifies overspending compared to category medians
- Suggests specific merchants/items to reduce
- Provides percentage comparisons (e.g., "40% higher than normal")
- Gives actionable advice (e.g., "switch to regular coffee")

### Smart Categorization
- Automatically normalizes column names
- Handles various CSV formats
- Groups spending by categories and merchants
- Detects subscription patterns

### User Experience
- Clean, modern chat interface
- Responsive design for all screen sizes
- Error handling and loading states
- Professional financial agent aesthetic

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the maintainers.