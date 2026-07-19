const express = require('express');
const { addReminder, getReminders, deleteReminder } = require('../controllers/reminderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('patient')); // Secure reminders to patients only

router.post('/', addReminder);
router.get('/', getReminders);
router.delete('/:id', deleteReminder);

module.exports = router;
