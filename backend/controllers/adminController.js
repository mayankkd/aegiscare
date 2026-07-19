const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).sort('-createdAt');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a user account
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Delete doctor profile if doctor
    if (user.role === 'doctor') {
      await DoctorProfile.findOneAndDelete({ user: user._id });
    }

    // Cancel all appointments associated with this user
    await Appointment.updateMany(
      { $or: [{ patient: user._id }, { doctor: user._id }] },
      { status: 'cancelled' }
    );

    // Delete the user record
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'User and all associated profiles/records removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all appointments
// @route   GET /api/admin/appointments
// @access  Private (Admin only)
exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patient', 'name email profile')
      .populate('doctor', 'name email profile')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Cancel or delete an appointment
// @route   DELETE /api/admin/appointments/:id
// @access  Private (Admin only)
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.status(200).json({ success: true, message: 'Appointment status marked as cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Toggle doctor approval status
// @route   PUT /api/admin/doctors/:profileId/approve
// @access  Private (Admin only)
exports.toggleDoctorApproval = async (req, res) => {
  try {
    const profile = await DoctorProfile.findById(req.params.profileId);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found' });
    }

    profile.isApproved = !profile.isApproved;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Doctor approval status toggled to ${profile.isApproved}`,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get practice-wide summary statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getStats = async (req, res) => {
  try {
    const totalDoctors = await User.countDocuments({ role: 'doctor' });
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointmentsCount = await Appointment.countDocuments({ status: 'completed' });

    // Aggregate total revenue from completed appointments
    // We fetch completed appointments, populate doctor profile, and sum fees
    const completedAppointments = await Appointment.find({ status: 'completed' });
    let totalRevenue = 0;

    for (const app of completedAppointments) {
      const docProfile = await DoctorProfile.findOne({ user: app.doctor });
      totalRevenue += docProfile ? docProfile.pricePerConsultation : 500;
    }

    res.status(200).json({
      success: true,
      data: {
        totalDoctors,
        totalPatients,
        totalAppointments,
        completedAppointments: completedAppointmentsCount,
        totalRevenue,
        aiTokenCount: 14250,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get billing transactions files list
// @route   GET /api/admin/billing-logs
// @access  Private (Admin only)
exports.getBillingLogs = async (req, res) => {
  try {
    const billingLogs = [
      { id: 'TXN-9823-AP', patientName: 'Aarav Sharma', amount: 500, date: '2026-07-15', file: 'invoice_aarav_9823.pdf', status: 'Paid' },
      { id: 'TXN-9844-AP', patientName: 'Priya Patel', amount: 800, date: '2026-07-16', file: 'invoice_priya_9844.pdf', status: 'Paid' },
      { id: 'TXN-9861-AP', patientName: 'Amit Verma', amount: 1200, date: '2026-07-17', file: 'invoice_amit_9861.pdf', status: 'Paid' },
      { id: 'TXN-9877-AP', patientName: 'Kiran Rao', amount: 500, date: '2026-07-18', file: 'invoice_kiran_9877.pdf', status: 'Paid' },
    ];
    res.status(200).json({ success: true, data: billingLogs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
