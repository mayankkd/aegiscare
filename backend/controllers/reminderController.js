const Reminder = require('../models/Reminder');

// @desc    Create a pill reminder
// @route   POST /api/reminders
// @access  Private (Patient only)
exports.addReminder = async (req, res) => {
  try {
    const { medicineName, dosage, frequency, time } = req.body;

    if (!medicineName || !dosage || !time) {
      return res.status(400).json({ success: false, error: 'Please provide medicineName, dosage and time' });
    }

    const reminder = await Reminder.create({
      patient: req.user.id,
      medicineName,
      dosage,
      frequency: frequency || 'daily',
      time,
    });

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: reminder,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all pill reminders for current patient
// @route   GET /api/reminders
// @access  Private (Patient only)
exports.getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ patient: req.user.id }).sort('time');
    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a pill reminder
// @route   DELETE /api/reminders/:id
// @access  Private (Patient only)
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    // Owner check
    if (reminder.patient.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to delete this reminder' });
    }

    await Reminder.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
