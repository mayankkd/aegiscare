const express = require('express');
const { getOwnEhr, updateOwnEhr, getPatientEhr } = require('../controllers/ehrController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // Secure all EHR routes

router.get('/', authorize('patient'), getOwnEhr);
router.put('/', authorize('patient'), updateOwnEhr);
router.get('/patient/:patientUserId', authorize('doctor', 'admin'), getPatientEhr);

module.exports = router;
