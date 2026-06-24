const express = require('express');
const router = express.Router();
const accountantController = require('../controllers/accountantController');
const { protect, authorize } = require('../middleware/auth');

// View all transactions
router.get('/transactions', protect, authorize('ACCOUNTANT', 'ADMIN', 'HOD'), accountantController.getAllTransactions);

// Confirm a payment manually
router.put('/transactions/:id/confirm', protect, authorize('ACCOUNTANT', 'ADMIN'), accountantController.confirmPayment);

// View all students with balance
router.get('/students', protect, authorize('ACCOUNTANT', 'ADMIN', 'HOD'), accountantController.getAllStudents);

module.exports = router;