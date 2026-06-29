const express = require('express');
const router = express.Router();
const verifyController = require('../controllers/verifyController');

// Public route - no authentication needed
router.get('/:indexNumber', verifyController.verifyStudent);

module.exports = router;