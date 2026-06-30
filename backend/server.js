const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import database connection
const pool = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const duesRoutes = require('./routes/dues');
const accountantRoutes = require('./routes/accountant');
const hodRoutes = require('./routes/hod');
const expenseRoutes = require('./routes/expense');
const studentRoutes = require('./routes/student');
const repRoutes = require('./routes/rep');
const publicRoutes = require('./routes/public');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dues', duesRoutes);
app.use('/api/accountant', accountantRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/rep', repRoutes);
app.use('/api/public', publicRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🎓 HTU Computer Science Dept - Student Dues Payment System API',
    status: 'running'
  });
});

// Port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});