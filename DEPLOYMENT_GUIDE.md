# Deployment Guide - Railway Platform

This guide explains how to deploy your Team Task Manager application to Railway (as required by the assignment).

## What is Railway?

Railway is a modern platform that makes it easy to deploy web applications. It automatically detects your project type and deploys it with minimal configuration.

## Prerequisites

1. A GitHub account (https://github.com/)
2. A Railway account (https://railway.app/)
3. Your completed project ready to deploy

## Step 1: Prepare Your Project for Deployment

### 1.1 Create a .gitignore File

Create a file named `.gitignore` in the `backend` folder:

```
node_modules/
.env
.DS_Store
*.log
```

This tells Git to ignore files that shouldn't be uploaded.

### 1.2 Update package.json

Make sure your `backend/package.json` has the correct start script:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### 1.3 Environment Variables Checklist

Make sure you have these variables ready:
- `PORT` (Railway will set this automatically)
- `MONGODB_URI` (you'll get this from Railway's MongoDB)
- `JWT_SECRET` (use a strong random string)
- `FRONTEND_URL` (your Railway frontend URL)

## Step 2: Create GitHub Repository

### 2.1 Initialize Git (if not already done)

Open terminal in the `team-task-manager` folder:

```bash
git init
git add .
git commit -m "Initial commit: Team Task Manager"
```

### 2.2 Create Repository on GitHub

1. Go to https://github.com/
2. Click "New Repository"
3. Name it: `team-task-manager`
4. Don't initialize with README (you already have one)
5. Click "Create Repository"

### 2.3 Push to GitHub

Copy the commands from GitHub and run them:

```bash
git remote add origin https://github.com/YOUR_USERNAME/team-task-manager.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy Backend on Railway

### 3.1 Sign Up for Railway

1. Go to https://railway.app/
2. Click "Start a New Project"
3. Sign in with GitHub

### 3.2 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `team-task-manager` repository
4. Railway will detect it as a Node.js app

### 3.3 Add MongoDB Database

1. In your Railway project, click "New"
2. Select "Database"
3. Choose "MongoDB"
4. Railway will create a MongoDB instance

### 3.4 Configure Environment Variables

1. Click on your backend service
2. Go to "Variables" tab
3. Add these variables:

```
MONGODB_URI=<copy from MongoDB service>
JWT_SECRET=your-random-secret-key-here-make-it-long-and-secure
NODE_ENV=production
```

To get MongoDB URI:
- Click on the MongoDB service
- Go to "Variables" tab
- Copy the `MONGO_URL` value

### 3.5 Configure Build Settings

1. Click on your service
2. Go to "Settings"
3. Set **Root Directory**: `backend`
4. Set **Start Command**: `npm start`

### 3.6 Deploy

1. Railway will automatically deploy
2. Wait for deployment to complete
3. You'll get a URL like: `https://team-task-manager-production.up.railway.app`

## Step 4: Deploy Frontend on Railway

### 4.1 Update Frontend API URL

Before deploying frontend, update `frontend/config.js`:

```javascript
// Change this to your Railway backend URL
const API_URL = 'https://your-backend-url.railway.app/api';
```team-task-manager-production-846b.up.railway.app/api

Commit this change:

```bash
git add frontend/config.js
git commit -m "Update API URL for production"
git push
```

### 4.2 Create Frontend Service

Option 1: **Using Static Site Hosting**

1. In the same Railway project, click "New"
2. Select "Empty Service"
3. Connect to your GitHub repo
4. Go to Settings:
   - Root Directory: `frontend`
   - Build Command: (leave empty)
   - Start Command: `python3 -m http.server $PORT`

Option 2: **Using Nginx** (Recommended)

Create a `Dockerfile` in the `frontend` folder:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Then in Railway:
- Root Directory: `frontend`
- Railway will auto-detect the Dockerfile

### 4.3 Get Your URLs

After deployment:
- Backend URL: `https://backend-xxx.railway.app`
- Frontend URL: `https://frontend-xxx.railway.app`

## Step 5: Update CORS Settings

Update `backend/server.js` to allow your frontend domain:

```javascript
app.use(cors({
  origin: ['https://your-frontend-url.railway.app'],
  credentials: true
}));
```

Or keep it open for development:

```javascript
app.use(cors()); // Allows all origins
```

## Step 6: Final Testing

1. Visit your frontend URL
2. Create a test account
3. Test all features:
   - Signup/Login
   - Create Project
   - Create Task
   - Dashboard
   - Role-based access

## Alternative: Deploy Both Together

You can also deploy backend and frontend together:

### Create a Combined Structure

```
team-task-manager/
├── backend/
│   └── (all backend files)
├── frontend/
│   └── (all frontend files)
└── package.json (root)
```

Create root `package.json`:

```json
{
  "name": "team-task-manager",
  "scripts": {
    "start": "cd backend && npm start",
    "build": "cd frontend && npm install && npm run build"
  }
}
```

Then deploy the entire repository to Railway.

## Common Deployment Issues

### Issue: Build Failed

**Solution:**
- Check the build logs in Railway
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Issue: Database Connection Failed

**Solution:**
- Check MONGODB_URI is correctly set
- Ensure you copied the complete connection string
- Verify MongoDB service is running

### Issue: 502 Bad Gateway

**Solution:**
- Check backend is listening on `process.env.PORT`
- Verify backend is running (check logs)
- Ensure MONGODB_URI is correct

### Issue: CORS Error in Production

**Solution:**
- Update CORS settings in `server.js`
- Add your frontend domain to allowed origins
- Or use `app.use(cors())` to allow all

### Issue: API Calls Not Working

**Solution:**
- Verify API_URL in `frontend/config.js`
- Check browser console for errors
- Ensure backend URL is correct

## Environment Variables Checklist

Before submission, ensure these are set:

**Backend:**
- `MONGODB_URI` - from Railway MongoDB service
- `JWT_SECRET` - random secure string
- `PORT` - (Railway sets automatically)
- `NODE_ENV` - set to "production"

**Frontend:**
- Update `API_URL` in `config.js` to backend URL

## Monitoring Your Deployment

### View Logs

1. Click on your service in Railway
2. Go to "Deployments" tab
3. Click "View Logs"

### Check Health

Test your API:
```
https://your-backend-url.railway.app/
```

Should return:
```json
{
  "message": "Team Task Manager API is running!",
  "version": "1.0.0"
}
```

## Getting Your Submission URLs

After successful deployment, note these URLs:

1. **Live Frontend URL**: `https://your-app.railway.app`
2. **Backend API URL**: `https://your-api.railway.app`
3. **GitHub Repository**: `https://github.com/username/team-task-manager`

## Cost Considerations

Railway offers:
- **Free Tier**: $5 credit per month
- Enough for small projects and demonstrations
- No credit card required to start

For this assignment, the free tier should be sufficient.

## Video Recording Tips

After deployment, record your 2-5 minute demo showing:

1. Open the live URL
2. Sign up as Admin
3. Create a project
4. Add team members
5. Create and assign tasks
6. Show dashboard
7. Update task status
8. Demonstrate role-based access

Use tools like:
- OBS Studio (free)
- Loom (easy screen recording)
- Windows Game Bar (Win + G)

## Submission Checklist

- [ ] Backend deployed and running on Railway
- [ ] Frontend deployed and accessible via URL
- [ ] MongoDB connected and working
- [ ] All features working (signup, login, CRUD)
- [ ] GitHub repository is public
- [ ] README.md is complete
- [ ] Demo video is recorded (2-5 minutes)
- [ ] Live URL is accessible
- [ ] Role-based access is working

## Need Help?

- Railway Documentation: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Check Railway logs for error messages
- Test locally first before deployment

Good luck with your deployment!
