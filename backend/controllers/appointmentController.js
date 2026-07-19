const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const emailService = require('../utils/emailService');

// @desc    Book a new appointment
// @route   POST /api/appointments
// @access  Private (Patient only)
exports.bookAppointment = async (req, res) => {
  try {
    const { doctorUserId, date, slot, symptoms } = req.body;

    if (!doctorUserId || !date || !slot) {
      return res.status(400).json({ success: false, error: 'Please provide doctor, date, and time slot' });
    }

    // Verify doctor exists and has doctor role
    const doctorUser = await User.findById(doctorUserId);
    if (!doctorUser || doctorUser.role !== 'doctor') {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    // Verify doctor has a profile
    const doctorProfile = await DoctorProfile.findOne({ user: doctorUserId });
    if (!doctorProfile) {
      return res.status(404).json({ success: false, error: 'Doctor profile not set up' });
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }

    // Determine the day of the week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[bookingDate.getUTCDay()];

    // Verify if doctor works on this day and has this slot template
    const daySchedule = doctorProfile.weeklySlots.find((s) => s.day === dayName);
    if (!daySchedule || !daySchedule.timeSlots.includes(slot)) {
      return res.status(400).json({ success: false, error: 'Doctor is not available at this slot on this day' });
    }

    // Check if slot is already booked
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      doctor: doctorUserId,
      date: { $gte: startOfDay, $lte: endOfDay },
      slot,
      status: { $ne: 'cancelled' },
    });

    if (existingAppointment) {
      return res.status(400).json({ success: false, error: 'This time slot is already booked' });
    }

    // Create the appointment (initially pending, awaits payment)
    const appointment = await Appointment.create({
      patient: req.user.id,
      doctor: doctorUserId,
      date: bookingDate,
      slot,
      symptoms: symptoms || '',
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    // Generate secure room ID
    appointment.meetingRoom = `aegiscare-${appointment._id}`;
    await appointment.save();

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get user's appointments (Patient or Doctor)
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res) => {
  try {
    let appointments;

    if (req.user.role === 'patient') {
      appointments = await Appointment.find({ patient: req.user.id })
        .populate('doctor', 'name email profile')
        .sort('-date -slot');
      
      // Also attach doctor profile info (specialization, consultation price) to the response for convenience
      const updatedAppointments = await Promise.all(
        appointments.map(async (app) => {
          const appObj = app.toObject();
          if (app.doctor) {
            const profile = await DoctorProfile.findOne({ user: app.doctor._id }).select('specialization pricePerConsultation');
            appObj.doctorProfile = profile;
          }
          return appObj;
        })
      );
      return res.status(200).json({ success: true, count: updatedAppointments.length, data: updatedAppointments });
    } else if (req.user.role === 'doctor') {
      appointments = await Appointment.find({ doctor: req.user.id })
        .populate('patient', 'name email profile')
        .sort('-date -slot');
      
      return res.status(200).json({ success: true, count: appointments.length, data: appointments });
    }

    res.status(400).json({ success: false, error: 'Invalid role' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update appointment status (Cancel or Complete)
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid status update' });
    }

    let appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Role checks:
    // Patient can cancel their own booking
    // Doctor can update status of their own bookings
    if (req.user.role === 'patient') {
      if (appointment.patient.toString() !== req.user.id) {
        return res.status(401).json({ success: false, error: 'Not authorized to modify this appointment' });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({ success: false, error: 'Patients can only cancel appointments' });
      }
    } else if (req.user.role === 'doctor') {
      if (appointment.doctor.toString() !== req.user.id) {
        return res.status(401).json({ success: false, error: 'Not authorized to modify this appointment' });
      }
    }

    appointment.status = status;
    await appointment.save();

    // Trigger email and socket notifications on cancellation
    if (status === 'cancelled') {
      // Socket emit
      const io = req.app.get('io');
      if (io) {
        const isPatient = req.user.role === 'patient';
        const recipientId = isPatient ? appointment.doctor : appointment.patient;
        io.to(recipientId.toString()).emit('notification', {
          title: 'Appointment Cancelled',
          message: `Your appointment scheduled on ${new Date(appointment.date).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${appointment.slot} has been cancelled by ${req.user.name}.`,
          timestamp: new Date(),
        });
      }

      // Email dispatch
      (async () => {
        const patientUser = await User.findById(appointment.patient);
        const doctorUser = await User.findById(appointment.doctor);
        if (patientUser && doctorUser) {
          await emailService.sendCancellationEmail(
            patientUser.email,
            patientUser.name,
            appointment.date,
            appointment.slot,
            doctorUser.name
          );
          await emailService.sendCancellationEmail(
            doctorUser.email,
            doctorUser.name,
            appointment.date,
            appointment.slot,
            doctorUser.name
          );
        }
      })().catch((err) => console.error('Cancellation email error:', err.message));
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add prescription/medical notes
// @route   POST /api/appointments/:id/prescription
// @access  Private (Doctor only)
exports.addPrescription = async (req, res) => {
  try {
    const { prescription } = req.body;

    if (!prescription) {
      return res.status(400).json({ success: false, error: 'Please enter prescription/medical notes' });
    }

    let appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Check if doctor owns this appointment
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to modify this appointment' });
    }

    appointment.prescription = prescription;
    appointment.status = 'completed'; // Auto mark as completed when prescription is written
    await appointment.save();

    // Trigger email notification asynchronously
    (async () => {
      const patientUser = await User.findById(appointment.patient);
      const doctorUser = await User.findById(appointment.doctor);
      if (patientUser && doctorUser) {
        await emailService.sendPrescriptionEmail(
          patientUser.email,
          patientUser.name,
          doctorUser.name
        );
      }
    })().catch((err) => console.error('Prescription email error:', err.message));

    // Trigger socket notification to the patient
    const io = req.app.get('io');
    if (io) {
      io.to(appointment.patient.toString()).emit('notification', {
        title: 'Prescription Ready',
        message: `Dr. ${req.user.name} has submitted your clinical prescription sheet.`,
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Upload medical report files for appointment
// @route   POST /api/appointments/:id/reports
// @access  Private (Patient only)
exports.uploadReports = async (req, res) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Check if patient owns this appointment
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to upload reports for this booking' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a file' });
    }

    // Determine the file URL:
    // If it's a Cloudinary storage, req.file.path contains the URL.
    // If it's local disk storage, we generate a relative url.
    let fileUrl = req.file.path;
    if (req.file.filename) {
      // Local storage fallback
      fileUrl = `http://localhost:5001/uploads/${req.file.filename}`;
    }

    const newReport = {
      name: req.file.originalname,
      url: fileUrl,
      uploadedAt: new Date(),
    };

    appointment.reports.push(newReport);
    await appointment.save();

    res.status(200).json({
      success: true,
      data: appointment.reports,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Generate professional PDF prescription
// @route   GET /api/appointments/:id/prescription-pdf
// @access  Private (Patient or Doctor)
exports.generatePrescriptionPDF = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email profile')
      .populate('doctor', 'name email profile');

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Role check: patient or doctor associated with this appointment
    if (
      appointment.patient._id.toString() !== req.user.id &&
      appointment.doctor._id.toString() !== req.user.id
    ) {
      return res.status(401).json({ success: false, error: 'Not authorized to download this prescription' });
    }

    if (appointment.status !== 'completed' || !appointment.prescription) {
      return res.status(400).json({ success: false, error: 'Prescription has not been written or consultation is not complete yet' });
    }

    const doctorProfile = await DoctorProfile.findOne({ user: appointment.doctor._id });

    // Initialize PDF Document
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=prescription-${req.params.id}.pdf`);
    
    doc.pipe(res);

    // Header Styles
    doc.fontSize(22).fillColor('#0056b3').text('AEGISCARE CLINICAL PORTAL', { align: 'center', bold: true });
    doc.fontSize(10).fillColor('#6c757d').text('Telehealth E-Prescription System • HIPAA Compliant', { align: 'center' });
    doc.moveDown(1.5);

    // Draw Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').lineWidth(1.5).stroke();
    doc.moveDown(1);

    // Doctor details on left, Patient on right
    const currentY = doc.y;
    doc.fontSize(11).fillColor('#111111');
    doc.text(`DOCTOR DETAIL:`, 50, currentY, { bold: true });
    doc.fontSize(10).text(`${appointment.doctor.name}`);
    doc.text(`${doctorProfile ? doctorProfile.specialization : 'General Physician'}`);
    doc.text(`Exp: ${doctorProfile ? doctorProfile.experience : 5} Years`);
    
    doc.text(`PATIENT DETAIL:`, 320, currentY, { bold: true });
    doc.fontSize(10).text(`Name: ${appointment.patient.name}`);
    
    const calculateAge = (dob) => {
      if (!dob) return 'N/A';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };
    
    doc.text(`Age: ${calculateAge(appointment.patient.profile?.dateOfBirth)}`);
    doc.text(`Gender: ${appointment.patient.profile?.gender || 'N/A'}`);
    
    doc.moveDown(2);

    // Draw Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').lineWidth(1).stroke();
    doc.moveDown(1);

    // Prescription Date
    doc.fontSize(9).fillColor('#6c757d').text(`Date: ${new Date(appointment.date).toLocaleDateString('en-US')}`, { align: 'right' });
    doc.moveDown(1);

    // Prescription Heading
    doc.fontSize(14).fillColor('#0056b3').text('Rx (Prescribed Medicines & Dosage)', { bold: true });
    doc.moveDown(0.5);

    // Prescribed Content
    doc.fontSize(11).fillColor('#333333').text(appointment.prescription, {
      align: 'left',
      lineGap: 4,
    });
    
    doc.moveDown(4);

    // Signature Area
    const sigY = doc.y;
    doc.moveTo(350, sigY).lineTo(550, sigY).strokeColor('#999999').lineWidth(1).stroke();
    doc.fontSize(9).fillColor('#6c757d').text('Authorized Signatory', 350, sigY + 5, { align: 'center' });
    doc.fontSize(10).fillColor('#333333').text(appointment.doctor.name, 350, sigY + 18, { align: 'center', bold: true });

    // Footer Disclaimer
    doc.fontSize(8).fillColor('#adb5bd').text(
      'Disclaimer: This is a digitally signed electronic prescription generated via AegisCare Telehealth. It was created following a virtual evaluation of the patient.',
      50,
      700,
      { align: 'center', width: 500 }
    );

    doc.end();
  } catch (error) {
    console.error('Error generating prescription PDF:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to generate PDF. ' + error.message });
    }
  }
};


