const express = require('express');
const { check } = require('express-validator');
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const {
  bookAppointment,
  getAppointments,
  updateAppointment,
  addPrescription,
  uploadReports,
  generatePrescriptionPDF,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect); // All appointment routes require authentication

router.post(
  '/',
  authorize('patient'),
  [
    check('doctorUserId', 'Doctor user ID is required').not().isEmpty(),
    check('date', 'Valid appointment date is required').not().isEmpty(),
    check('slot', 'Time slot is required').not().isEmpty(),
    validate,
  ],
  bookAppointment
);

router.get('/', getAppointments);

router.put('/:id', updateAppointment);

router.post(
  '/:id/prescription',
  authorize('doctor'),
  [
    check('prescription', 'Prescription notes are required').not().isEmpty(),
    validate,
  ],
  addPrescription
);

router.post('/:id/reports', authorize('patient'), upload.single('report'), uploadReports);

router.get('/:id/prescription-pdf', generatePrescriptionPDF);

router.post('/:id/create-order', authorize('patient'), createOrder);
router.post('/:id/verify-payment', authorize('patient'), verifyPayment);

module.exports = router;
