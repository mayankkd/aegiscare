const mongoose = require('mongoose');

const EhrRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One EHR record per patient
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
      default: '',
    },
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
    chronicDiseases: [
      {
        type: String,
        trim: true,
      },
    ],
    previousSurgeries: [
      {
        type: String,
        trim: true,
      },
    ],
    currentMedicines: [
      {
        type: String,
        trim: true,
      },
    ],
    vaccinationHistory: [
      {
        vaccineName: { type: String, required: true },
        date: { type: Date, required: true },
      },
    ],
    familyHistory: {
      type: String,
      default: '',
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EhrRecord', EhrRecordSchema);
