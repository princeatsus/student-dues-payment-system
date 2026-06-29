const express = require('express');
const router = express.Router();
const repController = require('../controllers/repController');
const { protect, authorize } = require('../middleware/auth');

// All endpoints require COURSE_REP or ADMIN authentication
router.get('/class-roster', protect, authorize('COURSE_REP', 'ADMIN'), repController.getClassRoster);
router.post('/remind', protect, authorize('COURSE_REP', 'ADMIN'), repController.sendReminderEmail);

module.exports = router;
