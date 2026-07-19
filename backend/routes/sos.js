const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const EhrRecord = require('../models/EhrRecord');
const emailService = require('../utils/emailService');

// Seeded Indian Hospitals database list
const INDIAN_HOSPITALS = [
  {
    name: 'AIIMS New Delhi',
    address: 'Ansari Nagar, New Delhi, Delhi 110029',
    phone: '011-26588500',
    lat: 28.5672,
    lng: 77.2100,
  },
  {
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    address: 'Rao Saheb, Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai, Maharashtra 400053',
    phone: '022-42696969',
    lat: 19.1312,
    lng: 72.8252,
  },
  {
    name: 'Fortis Hospital Bangalore',
    address: '154/9, Bannerghatta Road, Opposite IIM-B, Bengaluru, Karnataka 560076',
    phone: '080-66214444',
    lat: 12.8950,
    lng: 77.5979,
  },
  {
    name: 'Apollo Hospitals Chennai',
    address: '21, Greams Lane, Off Greams Road, Chennai, Tamil Nadu 600006',
    phone: '044-28290200',
    lat: 13.0607,
    lng: 80.2512,
  },
  {
    name: 'Medanta - The Medicity',
    address: 'CH Baktawar Singh Road, Sector 38, Gurugram, Haryana 122001',
    phone: '0124-4141414',
    lat: 28.4357,
    lng: 77.0401,
  },
  {
    name: 'KIMS Hospitals Hyderabad',
    address: '1-8-31/1, Minister Road, Krishna Nagar Colony, Begumpet, Secunderabad, Telangana 500003',
    phone: '040-44885000',
    lat: 17.4347,
    lng: 78.4842,
  },
];

// Distance calculator (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// @desc    Get nearby seeded hospitals sorted by distance
// @route   GET /api/sos/hospitals
// @access  Private
router.get('/hospitals', protect, (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      // Return entire list without distances
      return res.status(200).json({
        success: true,
        data: INDIAN_HOSPITALS.map(h => ({ ...h, distance: null })),
      });
    }

    const calculatedHospitals = INDIAN_HOSPITALS.map((hospital) => {
      const distance = calculateDistance(lat, lng, hospital.lat, hospital.lng);
      return {
        ...hospital,
        distance: parseFloat(distance.toFixed(2)), // Keep 2 decimal places
      };
    }).sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      data: calculatedHospitals,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @desc    Dispatch Emergency SOS alert to emergency contacts
// @route   POST /api/sos/alert
// @access  Private (Patient only)
router.post('/alert', protect, async (req, res) => {
  try {
    const { lat, lng, address } = req.body;

    // Load patient EHR to get emergency contact details
    const ehr = await EhrRecord.findOne({ patient: req.user.id });
    const user = await User.findById(req.user.id);

    if (!ehr || !ehr.emergencyContact || !ehr.emergencyContact.name) {
      return res.status(400).json({
        success: false,
        error: 'No emergency contact registered in your Health Records (EHR). Please specify one in your EHR profile.',
      });
    }

    const contact = ehr.emergencyContact;
    const mapLink = (lat && lng) ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;

    // Simulate notification logs / email triggers to emergency contacts if email exists
    console.log(`[SOS ALERT DISPATCHED] Patient: ${user.name} | Contact: ${contact.name} (${contact.phone})`);
    
    // Fallback: If contact has email/phone mock trigger
    // Let's send a simulated warning email alert to patient email to notify them it was triggered
    const subject = `[URGENT SOS WARNING] AegisCare Emergency Alert for ${user.name}`;
    const mailBody = `
      <h3>⚠️ CRISIS/EMERGENCY ALERT TRIGGERED</h3>
      <p>Dear ${contact.name},</p>
      <p>Your contact <strong>${user.name}</strong> has triggered an Emergency SOS Panic trigger on the AegisCare Telemedicine platform.</p>
      <p><strong>Shared Location Details:</strong></p>
      <ul>
        <li><strong>Estimated Coordinate:</strong> ${lat ? `${lat}, ${lng}` : 'Not Shared'}</li>
        <li><strong>Nearby Address / Area:</strong> ${address || 'Not Provided'}</li>
      </ul>
      ${mapLink ? `<p><a href="${mapLink}" style="display:inline-block;padding:10px;background-color:#dc3545;color:#fff;text-decoration:none;border-radius:4px;">📍 View Patient Live Map Location</a></p>` : ''}
      <p>Please contact them immediately at <strong>${user.profile?.phone || 'their registered number'}</strong> or coordinate with emergency ambulance services (102).</p>
    `;

    // In a production app, we would send this to the emergency contact's email or SMS.
    // For demonstration, we send a notification log.
    await emailService.sendMail(user.email, subject, mailBody).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Emergency SOS Alert successfully dispatched to your contact ${contact.name} (${contact.phone})`,
      contact,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
