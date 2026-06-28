# Vercel Deployment Guide

## Quick Setup

1. **Push your code to GitHub** (if not already done)

2. **In Vercel Dashboard:**
   - Click "New Project"
   - Import your GitHub repository
   - Select "Confirm and Deploy" (Vercel auto-detects the setup)

3. **Add Environment Variables:**
   - Go to Settings → Environment Variables
   - Add this variable:
     - **Name:** `VITE_API_URL`
     - **Value:** `https://ai-ats-gateway.onrender.com`
     - **Environments:** Production
   - Click "Save"

4. **Redeploy:**
   - Go to Deployments
   - Click the three dots menu on the latest deployment
   - Select "Redeploy"

## What's Configured

- ✅ `vercel.json` - Routes all requests to `/index.html` (SPA configuration)
- ✅ `.vercelignore` - Excludes backend, Docker, and unnecessary files
- ✅ `frontend/vite.config.js` - Ready for production build
- ✅ Root `package.json` - Has `vercel-build` script configured

## Troubleshooting

**Still getting 404 errors?**

- Make sure your backend at `https://ai-ats-gateway.onrender.com` is running
- Test the backend: Visit `https://ai-ats-gateway.onrender.com/api/resumes` in your browser
- Verify CORS headers are being sent (check `backend/server.js`)

**Environment variable not working?**

- Redeploy after adding the environment variable (it's required for changes to take effect)
- Check Vercel build logs to ensure `VITE_API_URL` is being read

## API Endpoint

In production, the frontend will call:

- `https://ai-ats-gateway.onrender.com/api/resumes` (for API requests)

Make sure your backend is deployed at this URL and responding correctly.
