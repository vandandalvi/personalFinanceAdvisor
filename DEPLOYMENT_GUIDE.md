# Deployment Guide

## Prerequisites
- Git repository pushed to GitHub
- Vercel account (for frontend)
- Render account (for backend)
- Google Gemini API key

## Backend Deployment on Render

### Step 1: Create New Web Service
1. Go to https://render.com/
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository: `personalFinanceManager`

### Step 2: Configure Service
- **Name**: `personal-finance-backend` (or your choice)
- **Environment**: `Python 3`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && gunicorn app:app`

### Step 3: Set Environment Variables
Click "Environment" tab and add:
- `PYTHON_VERSION`: `3.13.0`
- `GEMINI_API_KEY`: Your Google Gemini API key
- `ANSWER_MODE`: `ai-only`
- `CSV_CONTEXT_MAX_CHARS`: `120000`

### Step 4: Deploy
- Click "Create Web Service"
- Wait for deployment to complete
- Copy the backend URL (e.g., `https://personal-finance-backend.onrender.com`)

## Frontend Deployment on Vercel

### Step 1: Update API Endpoint
1. Open `frontend/vite-project/src/config/api.js`
2. Update the backend URL:
```javascript
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-backend-url.onrender.com'  // Replace with your Render URL
  : 'http://localhost:5000';
```

### Step 2: Deploy to Vercel
1. Go to https://vercel.com/
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend/vite-project`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Environment Variables (if needed)
Add in Vercel dashboard under "Settings" → "Environment Variables":
- No environment variables needed for basic setup

### Step 4: Deploy
- Click "Deploy"
- Wait for deployment to complete
- Your app will be live at `https://your-app-name.vercel.app`

## Post-Deployment Configuration

### Update Backend CORS
In `backend/app.py`, update the CORS origins with your Vercel URL:
```python
CORS(app, origins=[
    "http://localhost:5173",
    "https://your-app-name.vercel.app",  # Your actual Vercel URL
])
```

### Update Frontend API Config
In `frontend/vite-project/src/config/api.js`:
```javascript
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-backend-url.onrender.com'  // Your actual Render URL
  : 'http://localhost:5000';
```

### Redeploy
After updating URLs:
1. Commit and push changes to GitHub
2. Render will auto-deploy backend
3. Vercel will auto-deploy frontend

## Testing Deployment

### Test Backend
```bash
curl https://your-backend-url.onrender.com/
```
Should return: `{"message": "Personal Finance Manager API is running"}`

### Test Frontend
1. Visit your Vercel URL
2. Test welcome page loads
3. Try demo file upload
4. Check dashboard displays correctly
5. Test AI chat feature

## Troubleshooting

### Backend Issues
- **500 Error**: Check Render logs for errors
- **CORS Error**: Verify frontend URL in CORS origins
- **Module Not Found**: Check requirements.txt includes all dependencies

### Frontend Issues
- **Blank Page**: Check browser console for errors
- **API Errors**: Verify backend URL in api.js
- **Build Failed**: Check package.json and dependencies

### Common Issues
1. **Free tier sleep**: Render free tier sleeps after 15 min inactivity (first request takes ~30s)
2. **CSV upload fails**: Check file size limits (Render: 10MB, Vercel: 4.5MB)
3. **AI chat not working**: Verify GEMINI_API_KEY is set in Render

## Maintenance

### Update Dependencies
```bash
# Backend
cd backend
pip install --upgrade -r requirements.txt

# Frontend
cd frontend/vite-project
npm update
```

### Monitor Usage
- Render: Check dashboard for bandwidth and build minutes
- Vercel: Check analytics for traffic and bandwidth
- Google AI: Monitor Gemini API usage in Google Cloud Console

## Free Tier Limits

### Render
- 750 hours/month
- 512 MB RAM
- Sleeps after 15 min inactivity

### Vercel
- 100 GB bandwidth/month
- 6,000 build minutes/month
- Unlimited projects

### Google Gemini
- 15 requests/minute
- 1 million tokens/minute
- Free tier quota

## Support
For issues, check:
- Render logs: https://dashboard.render.com/
- Vercel logs: https://vercel.com/dashboard
- GitHub Issues: Create issue in repository
