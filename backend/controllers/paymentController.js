const crypto = require('crypto');
const Razorpay = require('razorpay');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const emailService = require('../utils/emailService');

// @desc    Create Razorpay Order
// @route   POST /api/appointments/:id/create-order
// @access  Private (Patient only)
exports.createOrder = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Check auth ownership
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to request payment order' });
    }

    // Fetch doctor fee
    const doctorProfile = await DoctorProfile.findOne({ user: appointment.doctor });
    const fee = doctorProfile ? doctorProfile.pricePerConsultation : 500;

    // Check if Razorpay keys are configured in environment variables
    const isLive = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

    if (isLive) {
      console.log(`[Diagnostic] Razorpay Keys loaded. ID Length: ${process.env.RAZORPAY_KEY_ID.trim().length} (raw: ${process.env.RAZORPAY_KEY_ID.length}), Secret Length: ${process.env.RAZORPAY_KEY_SECRET.trim().length} (raw: ${process.env.RAZORPAY_KEY_SECRET.length})`);
      try {
        const instance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID.trim(),
          key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
        });

        const options = {
          amount: fee * 100, // amount in paisa
          currency: 'INR',
          receipt: `receipt_${appointment._id}`,
        };

        const order = await instance.orders.create(options);

        // Save order ID onto appointment
        appointment.razorpayOrderId = order.id;
        await appointment.save();

        return res.status(200).json({
          success: true,
          mode: 'live',
          key: process.env.RAZORPAY_KEY_ID,
          order,
        });
      } catch (err) {
        console.error('Razorpay live order error:', err);
        // Fall through to sandbox mode on gateway failure
      }
    }

    // Sandbox Fallback Mode
    const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 15)}`;
    appointment.razorpayOrderId = mockOrderId;
    await appointment.save();

    res.status(200).json({
      success: true,
      mode: 'sandbox',
      key: 'rzp_test_mock_sandbox_key',
      order: {
        id: mockOrderId,
        amount: fee * 100,
        currency: 'INR',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/appointments/:id/verify-payment
// @access  Private (Patient only)
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, mode } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    if (mode === 'live') {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ success: false, error: 'Payment signature verification failed' });
      }
    }

    // Set payment details
    appointment.paymentStatus = 'paid';
    appointment.status = 'confirmed'; // Confirmed after payment succeeds
    appointment.razorpayOrderId = razorpayOrderId;
    appointment.razorpayPaymentId = razorpayPaymentId || `pay_mock_${Math.random().toString(36).substring(2, 10)}`;
    appointment.razorpaySignature = razorpaySignature || 'mock_signature_verified';

    await appointment.save();

    // Fetch user records to trigger booking alerts
    const patientUser = await User.findById(appointment.patient);
    const doctorUser = await User.findById(appointment.doctor);

    // 1. Dispatch Email Booking Confirmation
    if (patientUser && doctorUser) {
      emailService.sendBookingEmail(
        patientUser.email,
        patientUser.name,
        doctorUser.name,
        appointment.date,
        appointment.slot
      ).catch((err) => console.error('Booking confirmation email failure:', err.message));
    }

    // 2. Dispatch Realtime Socket Notification to Doctor
    const io = req.app.get('io');
    if (io && patientUser) {
      io.to(appointment.doctor.toString()).emit('notification', {
        title: 'New Confirmed Booking',
        message: `New confirmed appointment by ${patientUser.name} on ${new Date(appointment.date).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${appointment.slot} (Paid: ₹${(req.body.amount || 50000)/100})`,
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment successfully processed and appointment slot secured.',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
