# Quick Deployment Guide

## 🚀 Before You Start

You need:
- Git repository pushed to GitHub
- Vercel account (free)
- Render account (free)
- Google Gemini API key ([Get it here](https://makersuite.google.com/app/apikey))

## 📦 Step 1: Deploy Backend to Render

### 1.1 Create Web Service
1. Go to https://render.com/ and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select repository: `personalFinanceManager`

### 1.2 Configure Service
Fill in these settings:
- **Name**: `personal-finance-backend` (or any name you like)
- **Environment**: `Python 3`
- **Region**: Select closest to you
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && gunicorn app:app`

### 1.3 Add Environment Variables
Click **"Environment"** and add:
```
GEMINI_API_KEY = your_google_gemini_api_key_here
PYTHON_VERSION = 3.13.0
ANSWER_MODE = ai-only
CSV_CONTEXT_MAX_CHARS = 120000
```

### 1.4 Deploy
- Click **"Create Web Service"**
- Wait 3-5 minutes for deployment
- **IMPORTANT**: Copy your backend URL (e.g., `https://personal-finance-backend.onrender.com`)

## 🎨 Step 2: Deploy Frontend to Vercel

### 2.1 Import Project
1. Go to https://vercel.com/ and sign in
2. Click **"Add New"** → **"Project"**
3. Import from GitHub
4. Select repository: `personalFinanceManager`

### 2.2 Configure Build Settings
- **Framework Preset**: `Vite`
- **Root Directory**: `frontend/vite-project`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2.3 Deploy
- Click **"Deploy"**
- Wait 2-3 minutes
- **IMPORTANT**: Copy your frontend URL (e.g., `https://your-app-name.vercel.app`)

## 🔄 Step 3: Connect Frontend and Backend

### 3.1 Update Frontend API Configuration
Edit `frontend/vite-project/src/config/api.js`:
```javascript
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://YOUR-BACKEND-URL.onrender.com'  // ← Replace with your Render URL
  : 'http://localhost:5000';
```

### 3.2 Update Backend CORS
Edit `backend/app.py` (around line 12):
```python
CORS(app, origins=[
    "http://localhost:5173",
    "https://YOUR-APP-NAME.vercel.app",  # ← Replace with your Vercel URL
], supports_credentials=True)
```

### 3.3 Commit and Push
```bash
git add .
git commit -m "Update deployment URLs"
git push origin main
```

Both Render and Vercel will automatically redeploy with the new configuration!

## ✅ Step 4: Test Your Deployment

### Test Backend
Open in browser or use curl:
```bash
curl https://YOUR-BACKEND-URL.onrender.com/
```
Should return: `{"message": "Personal Finance Manager API is running"}`

### Test Frontend
1. Visit your Vercel URL: `https://YOUR-APP-NAME.vercel.app`
2. You should see the beautiful welcome page
3. Click **"Try Demo"** button
4. Dashboard should load with sample data
5. Test the AI chat feature

## 🎓 For Your Presentation

Your app is now LIVE! 🎉

**Show the examiner:**
1. **Welcome Page**: Modern, professional landing page
2. **Demo Feature**: Click "Try Demo" - instant sample data
3. **Mobile Responsive**: Resize browser or open on phone
4. **Dashboard**: Beautiful charts with real data
5. **AI Chat**: Ask questions about finances
6. **Multi-bank Support**: Works with SBI, Kotak, Axis

**Live URLs:**
- Frontend: `https://YOUR-APP-NAME.vercel.app`
- Backend: `https://YOUR-BACKEND-URL.onrender.com`

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend slow on first request | Normal! Free tier sleeps after 15 min. First request takes ~30 seconds |
| CORS error in browser | Check backend `app.py` has correct Vercel URL in CORS origins |
| Frontend can't reach backend | Verify `api.js` has correct Render URL |
| AI chat not working | Verify `GEMINI_API_KEY` is set in Render environment variables |
| Build failed on Vercel | Check `package.json` in `frontend/vite-project` directory |
| Build failed on Render | Check `requirements.txt` in `backend` directory |

## 📱 Features Deployed

✅ Mobile-first responsive design (works on all devices)
✅ Modern welcome/landing page with animations
✅ Pre-loaded demo file (kotak_sample.csv with 130 transactions)
✅ Multi-bank CSV support (SBI, Kotak, Axis Bank)
✅ Intelligent transaction categorization (Investment, Food, Shopping, etc.)
✅ Interactive charts and visualizations (Chart.js)
✅ AI-powered chat assistant (Google Gemini)
✅ Real-time analytics and insights

## 🔗 Important Links

- **Get Gemini API Key**: https://makersuite.google.com/app/apikey
- **Render Dashboard**: https://dashboard.render.com/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Detailed Guide**: See `DEPLOYMENT_GUIDE.md` for more info

## 💡 Pro Tips

1. **Free Tier Limits**:
   - Render: 750 hours/month, sleeps after 15 min inactivity
   - Vercel: 100 GB bandwidth/month
   - Keep services within free tier limits

2. **Performance**:
   - First request to backend takes ~30s (cold start)
   - Subsequent requests are fast
   - Demo feature loads instantly (cached)

3. **Maintenance**:
   - Both services auto-deploy on git push
   - Monitor usage in respective dashboards
   - Check Gemini API quota in Google Cloud Console

---

**Need detailed instructions?** See `DEPLOYMENT_GUIDE.md` for comprehensive guide!
**Questions?** Check troubleshooting section or create GitHub issue.