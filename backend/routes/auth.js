const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Register a new user
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Switch Role View (Demo Mode)
router.post('/switch-role', protect, authController.switchRole);

module.exports = router;