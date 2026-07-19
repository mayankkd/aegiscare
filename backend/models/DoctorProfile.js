const mongoose = require('mongoose');

const DoctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, 'Please add a specialization'],
      trim: true,
    },
    bio: {
      type: String,
      required: [true, 'Please add a biography'],
      maxlength: [1000, 'Bio cannot be more than 1000 characters'],
    },
    experience: {
      type: Number,
      required: [true, 'Please add years of experience'],
      min: [0, 'Experience cannot be negative'],
    },
    pricePerConsultation: {
      type: Number,
      required: [true, 'Please add consultation price'],
      min: [0, 'Price cannot be negative'],
    },
    rating: {
      type: Number,
      default: 4.8,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    reviewsCount: {
      type: Number,
      default: 12,
    },
    hospitalName: {
      type: String,
      default: 'AegisCare Clinic',
    },
    hospitalAddress: {
      type: String,
      default: 'AegisCare Clinic, Connaught Place, New Delhi, Delhi 110001',
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Online', 'Offline', 'Busy', 'In Consultation'],
      default: 'Offline',
    },
    languages: {
      type: [String],
      default: ['Hindi', 'English'],
    },
    city: {
      type: String,
      default: 'New Delhi',
    },
    // Doctor's weekly schedule template
    // e.g. { day: 'Monday', timeSlots: ['09:00 AM', '10:00 AM', '11:00 AM'] }
    weeklySlots: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          required: true,
        },
        timeSlots: [
          {
            type: String,
            required: true,
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

DoctorProfileSchema.index({ specialization: 1 });
DoctorProfileSchema.index({ pricePerConsultation: 1 });
DoctorProfileSchema.index({ city: 1 });

module.exports = mongoose.model('DoctorProfile', DoctorProfileSchema);
