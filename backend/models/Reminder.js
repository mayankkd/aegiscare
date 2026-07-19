const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    medicineName: {
      type: String,
      required: [true, 'Please add a medicine name'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Please specify dosage details'],
      trim: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    time: {
      type: String, // format: "HH:MM" (24-hour style, e.g. "09:30")
      required: [true, 'Please specify a reminder time'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Reminder', ReminderSchema);
