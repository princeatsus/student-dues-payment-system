const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public Alumni Verification Endpoint (No auth needed)
router.get('/verify', publicController.verifyAlumni);

// Public Gate Verification Endpoint (IoT Turnstile Simulation - No auth needed)
router.get('/gate-verify/:index_number', publicController.gateVerify);

module.exports = router;
