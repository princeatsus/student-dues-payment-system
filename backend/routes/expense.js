const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');

// Course Rep - submit expense request
router.post('/', protect, authorize('COURSE_REP', 'ADMIN'), expenseController.submitExpenseRequest);

// View all expense requests (filtered by role)
router.get('/', protect, expenseController.getExpenseRequests);

// HOD - approve or reject
router.put('/:id/approve', protect, authorize('HOD', 'ADMIN'), expenseController.approveExpenseRequest);
router.put('/:id/reject', protect, authorize('HOD', 'ADMIN'), expenseController.rejectExpenseRequest);

// Accountant - mark as disbursed
router.put('/:id/disburse', protect, authorize('ACCOUNTANT', 'ADMIN'), expenseController.disburseExpenseRequest);

module.exports = router;