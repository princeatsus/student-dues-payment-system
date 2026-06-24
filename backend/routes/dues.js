const express = require('express');
const router = express.Router();
const duesController = require('../controllers/duesController');
const { protect, authorize } = require('../middleware/auth');

// Student - view their balance
router.get('/balance', protect, duesController.getBalance);

// Accountant/Admin - get dues configuration
router.get('/config', protect, authorize('ACCOUNTANT', 'ADMIN', 'HOD'), duesController.getDuesConfig);

// Accountant/Admin - set dues for a semester
router.post('/config', protect, authorize('ACCOUNTANT', 'ADMIN'), duesController.setDuesConfig);

// Student - generate payment reference
router.post('/pay', protect, authorize('STUDENT'), duesController.generatePaymentReference);

module.exports = router;