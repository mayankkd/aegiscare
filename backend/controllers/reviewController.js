const Review = require('../models/Review');
const Appointment = require('../models/Appointment');

// @desc    Add review for completed consultation
// @route   POST /api/reviews
// @access  Private (Patient only)
exports.addReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;

    if (!appointmentId || !rating || !comment) {
      return res.status(400).json({ success: false, error: 'Please provide appointment ID, rating, and review comments' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Auth ownership check
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to write review for this appointment' });
    }

    // Status check
    if (appointment.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Reviews are only allowed for completed consultations' });
    }

    // Duplicate check
    if (appointment.isReviewed) {
      return res.status(400).json({ success: false, error: 'You have already submitted a review for this consultation' });
    }

    // Create review
    const review = await Review.create({
      patient: req.user.id,
      doctor: appointment.doctor,
      appointment: appointmentId,
      rating: Number(rating),
      comment: comment.trim(),
    });

    // Mark appointment as reviewed
    appointment.isReviewed = true;
    await appointment.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get reviews for a specific doctor
// @route   GET /api/reviews/doctor/:doctorUserId
// @access  Public
exports.getReviewsForDoctor = async (req, res) => {
  try {
    const reviews = await Review.find({ doctor: req.params.doctorUserId })
      .populate('patient', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
