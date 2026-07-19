const express = require('express');
const { getDoctors, getDoctorById, getDoctorAnalytics, updateDoctorStatus } = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getDoctors);

// Must be placed before /:id parameter route to avoid route matching conflicts
router.get('/analytics/dashboard', protect, authorize('doctor'), getDoctorAnalytics);
router.put('/status', protect, authorize('doctor'), updateDoctorStatus);

router.get('/:id', getDoctorById);

module.exports = router;
