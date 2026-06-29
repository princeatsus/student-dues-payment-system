const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect } = require('../middleware/auth');

// All endpoints require student authentication
router.get('/dashboard', protect, studentController.getStudentDashboard);
router.get('/transactions/history', protect, studentController.getTransactionsHistory);
router.get('/class-fund/status', protect, studentController.getClassFundStatus);

module.exports = router;
