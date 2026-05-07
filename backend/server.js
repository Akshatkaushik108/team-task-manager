// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

// Initialize Express app
const app = express();

// Middleware - CORS Configuration
app.use(cors({
  origin: ['team-task-manager-production-e0f7.up.railway.app'],
  credentials: true
})); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Database connection
console.log('🔍 Attempting to connect to MongoDB...');
console.log('🔍 Connection URI:', process.env.MONGODB_URI ? 'URI loaded from .env ✅' : '❌ No URI found, using default');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/team-task-manager')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Full error:', err);
  });

// Routes
app.use('/api/auth', authRoutes); // Authentication routes (signup, login)
app.use('/api/projects', projectRoutes); // Project management routes
app.use('/api/tasks', taskRoutes); // Task management routes
app.use('/api/users', userRoutes); // User routes

// Health check route
app.get('/', (req, res) => {
  res.json({
    message: 'Team Task Manager API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      projects: '/api/projects',
      tasks: '/api/tasks',
      users: '/api/users'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 API URL: http://localhost:${PORT}`);
});