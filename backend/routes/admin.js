const express = require('express');
const {
  getUsers,
  deleteUser,
  getAppointments,
  deleteAppointment,
  toggleDoctorApproval,
  getStats,
  getBillingLogs,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin')); // Secure entire admin sub-router

router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.get('/appointments', getAppointments);
router.delete('/appointments/:id', deleteAppointment);
router.put('/doctors/:profileId/approve', toggleDoctorApproval);
router.get('/stats', getStats);
router.get('/billing-logs', getBillingLogs);

module.exports = router;
