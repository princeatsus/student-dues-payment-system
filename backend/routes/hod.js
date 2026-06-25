const express = require('express');
const router = express.Router();
const hodController = require('../controllers/hodController');
const { protect, authorize } = require('../middleware/auth');

// View defaulters list
router.get('/defaulters', protect, authorize('HOD', 'ADMIN'), hodController.getDefaulters);

// Grant exam clearance override
router.post('/override', protect, authorize('HOD', 'ADMIN'), hodController.grantOverride);

// View all overrides
router.get('/overrides', protect, authorize('HOD', 'ADMIN', 'ACCOUNTANT'), hodController.getAllOverrides);

module.exports = router;