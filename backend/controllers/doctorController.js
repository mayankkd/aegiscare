const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const { getDoctorsCache, setDoctorsCache, invalidateDoctorsCache } = require('../utils/cache');

// @desc    Get all doctors with search and filter
// @route   GET /api/doctors
// @access  Public
exports.getDoctors = async (req, res) => {
  try {
    const { specialization, search, experience, maxFee, location, city, language, minRating } = req.query;
    
    const isBaseQuery = !specialization && !search && !experience && !maxFee && !location && !city && !language && !minRating;
    if (isBaseQuery) {
      const cachedData = getDoctorsCache();
      if (cachedData) {
        return res.status(200).json({
          success: true,
          count: cachedData.length,
          data: cachedData,
        });
      }
    }

    let query = {};

    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    if (experience) {
      query.experience = { $gte: Number(experience) };
    }

    if (maxFee) {
      query.pricePerConsultation = { $lte: Number(maxFee) };
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (language) {
      query.languages = { $in: [new RegExp(language, 'i')] };
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    if (location) {
      query.$or = [
        { hospitalName: { $regex: location, $options: 'i' } },
        { hospitalAddress: { $regex: location, $options: 'i' } },
      ];
    }

    // First find all profiles
    let doctorProfiles = await DoctorProfile.find(query).populate('user', 'name email profile');

    // If there is a search query for name, we filter the populated list
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      doctorProfiles = doctorProfiles.filter(
        (profile) => profile.user && searchRegex.test(profile.user.name)
      );
    }

    if (isBaseQuery) {
      setDoctorsCache(doctorProfiles);
    }

    res.status(200).json({
      success: true,
      count: doctorProfiles.length,
      data: doctorProfiles,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get doctor by ID (including slot availability calculations)
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctorById = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findById(req.params.id).populate('user', 'name email profile');

    if (!doctorProfile) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    const { date } = req.query; // YYYY-MM-DD format
    let availableSlots = [];

    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid date format' });
      }

      // Get day name (Monday, Tuesday, etc.)
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = daysOfWeek[parsedDate.getUTCDay()];

      // Find doctor's weekly template for this day
      const daySchedule = doctorProfile.weeklySlots.find((s) => s.day === dayName);

      if (daySchedule) {
        // Find existing appointments for this doctor on this specific day
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedAppointments = await Appointment.find({
          doctor: doctorProfile.user._id,
          date: { $gte: startOfDay, $lte: endOfDay },
          status: { $ne: 'cancelled' },
        });

        const bookedSlots = bookedAppointments.map((app) => app.slot);

        // Filter out booked slots
        availableSlots = daySchedule.timeSlots.filter((slot) => !bookedSlots.includes(slot));
      }
    }

    res.status(200).json({
      success: true,
      data: doctorProfile,
      availableSlots, // Only present if 'date' query parameter is provided
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get doctor dashboard analytics data
// @route   GET /api/doctors/analytics/dashboard
// @access  Private (Doctor only)
exports.getDoctorAnalytics = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findOne({ user: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found' });
    }

    const appointments = await Appointment.find({ doctor: req.user.id }).populate('patient');

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
    const activeAppointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length;

    const consultationFee = doctorProfile.pricePerConsultation || 500;
    const totalRevenue = completedAppointments * consultationFee;

    // Unique Patients
    const patientIds = appointments.map(a => a.patient?._id ? a.patient._id.toString() : '');
    const uniquePatientsCount = [...new Set(patientIds.filter(Boolean))].length;

    // Demographics breakdown
    let maleCount = 0;
    let femaleCount = 0;
    let otherCount = 0;

    appointments.forEach((app) => {
      if (app.patient && app.patient.profile && app.patient.profile.gender) {
        const gender = app.patient.profile.gender.toLowerCase();
        if (gender === 'male') maleCount++;
        else if (gender === 'female') femaleCount++;
        else otherCount++;
      } else {
        otherCount++;
      }
    });

    // Average visit duration mock (e.g. 18.2 minutes baseline)
    const averageVisitDuration = completedAppointments > 0 ? 18.2 : 0;

    // Compile Monthly Trend data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyBookings = {};
    const currentYear = new Date().getFullYear();

    months.forEach(m => {
      monthlyBookings[m] = 0;
    });

    appointments.forEach(app => {
      const appDate = new Date(app.date);
      if (appDate.getFullYear() === currentYear) {
        const monthName = months[appDate.getMonth()];
        if (monthlyBookings[monthName] !== undefined) {
          monthlyBookings[monthName]++;
        }
      }
    });

    const monthlyTrends = Object.keys(monthlyBookings).map(key => ({
      month: key,
      bookings: monthlyBookings[key],
      revenue: monthlyBookings[key] * consultationFee,
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          activeAppointments,
          totalRevenue,
          uniquePatients: uniquePatientsCount,
          consultationFee,
          averageVisitDuration,
          demographics: {
            male: maleCount,
            female: femaleCount,
            other: otherCount,
          },
        },
        monthlyTrends,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update doctor status (Online/Offline/Busy/In Consultation)
// @route   PUT /api/doctors/status
// @access  Private (Doctor only)
exports.updateDoctorStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Online', 'Offline', 'Busy', 'In Consultation'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid doctor status' });
    }

    const doctorProfile = await DoctorProfile.findOne({ user: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found' });
    }

    doctorProfile.status = status;
    await doctorProfile.save();
    invalidateDoctorsCache();

    // Broadcast update via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.emit('doctor:status-updated', {
        doctorId: doctorProfile.user.toString(),
        status: status,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: doctorProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

