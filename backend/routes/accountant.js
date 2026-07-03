const express = require('express');
const router = express.Router();
const accountantController = require('../controllers/accountantController');
const reconcileController = require('../controllers/reconcileController');
const { protect, authorize } = require('../middleware/auth');

// View all transactions
router.get('/transactions', protect, authorize('ACCOUNTANT', 'ADMIN', 'HOD'), accountantController.getAllTransactions);

// Confirm a payment manually
router.put('/transactions/:id/confirm', protect, authorize('ACCOUNTANT', 'ADMIN', 'STUDENT'), accountantController.confirmPayment);

// View all students with balance
router.get('/students', protect, authorize('ACCOUNTANT', 'ADMIN', 'HOD'), accountantController.getAllStudents);

// Reconciliation Wizard (MTN/Vodafone CSV statements)
router.post('/reconcile/upload', protect, authorize('ACCOUNTANT', 'ADMIN'), reconcileController.uploadStatement);
router.post('/reconcile/confirm', protect, authorize('ACCOUNTANT', 'ADMIN'), reconcileController.confirmReconciliation);
router.post('/reconcile/manual-assign', protect, authorize('ACCOUNTANT', 'ADMIN'), accountantController.manualAssignPayment);

// Google Directory Sync Cron endpoint
router.post('/sync-directory', protect, authorize('ACCOUNTANT', 'ADMIN', 'HOD'), accountantController.syncGoogleDirectory);
router.get('/sync-logs', protect, authorize('ACCOUNTANT', 'ADMIN'), accountantController.getSyncLogs);

module.exports = router;