# Deployment Guide

## Backend Deployment on Render

1. **Create a new Web Service on Render**
   - Go to [render.com](https://render.com) and sign up/login
   - Click "New" → "Web Service"
   - Connect your GitHub repository: `https://github.com/vandandalvi/personalFinanceManager`

2. **Configure the service:**
   - **Name**: `personal-finance-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && gunicorn app:app`
   - **Root Directory**: Leave empty (it will use the repo root)

3. **Environment Variables:**
   Add these environment variables in Render:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `PYTHON_VERSION`: `3.11.0`
   - `PORT`: `10000` (Render will set this automatically)

4. **Deploy**: Click "Create Web Service"

5. **Note your backend URL**: It will be something like `https://personal-finance-backend.onrender.com`

## Frontend Deployment on Vercel

1. **Update the backend URL**:
   - Edit `frontend/vite-project/.env.production`
   - Replace `your-backend-app.onrender.com` with your actual Render URL

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign up/login
   - Click "New Project"
   - Import your GitHub repository: `https://github.com/vandandalvi/personalFinanceManager`

3. **Configure the project**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend/vite-project`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables**:
   Add this environment variable in Vercel:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://personal-finance-backend.onrender.com`)

5. **Deploy**: Click "Deploy"

## Post-Deployment Steps

1. **Update CORS in backend**:
   - After getting your Vercel URL (e.g., `https://your-app.vercel.app`)
   - Update the CORS origins in `backend/app.py`
   - Replace `"https://your-app-name.vercel.app"` with your actual Vercel URL
   - Commit and push to trigger a new Render deployment

2. **Update Vercel proxy**:
   - Update `frontend/vite-project/vercel.json`
   - Replace `your-backend-app.onrender.com` with your actual Render URL

3. **Test the deployment**:
   - Visit your Vercel URL
   - Upload the sample CSV file
   - Test the dashboard and chat functionality

## Environment Files Summary

**Backend (.env in backend directory)**:
```
GEMINI_API_KEY=your_actual_api_key
```

**Frontend (.env.production)**:
```
VITE_API_URL=https://your-backend-app.onrender.com
```

## Troubleshooting

- **CORS errors**: Make sure the frontend URL is added to CORS origins in backend
- **API not found**: Verify the VITE_API_URL is correctly set
- **Build failures**: Check that all dependencies are in requirements.txt
- **Slow cold starts**: Render free tier has cold starts - first request may be slow

## URLs to Update

1. In `backend/app.py` - CORS origins
2. In `frontend/vite-project/.env.production` - Backend URL  
3. In `frontend/vite-project/vercel.json` - Backend URL for API proxy