const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true, // One review per appointment
    },
    rating: {
      type: Number,
      required: [true, 'Please add a star rating between 1 and 5'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Please add a comment review'],
      maxlength: [500, 'Comment cannot be more than 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Static method to recalculate average doctor ratings
ReviewSchema.statics.calculateAverageRating = async function (doctorId) {
  const obj = await this.aggregate([
    { $match: { doctor: doctorId } },
    {
      $group: {
        _id: '$doctor',
        averageRating: { $avg: '$rating' },
        reviewsCount: { $sum: 1 },
      },
    },
  ]);

  try {
    const DoctorProfile = mongoose.model('DoctorProfile');
    if (obj.length > 0) {
      await DoctorProfile.findOneAndUpdate(
        { user: doctorId },
        {
          rating: Math.round(obj[0].averageRating * 10) / 10,
          reviewsCount: obj[0].reviewsCount,
        }
      );
    } else {
      await DoctorProfile.findOneAndUpdate(
        { user: doctorId },
        {
          rating: 4.8, // baseline rating default
          reviewsCount: 0,
        }
      );
    }
  } catch (err) {
    console.error('Error in average rating calculation:', err.message);
  }
};

// Recalculate average rating on save
ReviewSchema.post('save', function () {
  this.constructor.calculateAverageRating(this.doctor);
});

// Recalculate average rating on deletion
ReviewSchema.post('remove', function () {
  this.constructor.calculateAverageRating(this.doctor);
});

module.exports = mongoose.model('Review', ReviewSchema);
