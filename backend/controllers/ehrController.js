const EhrRecord = require('../models/EhrRecord');
const User = require('../models/User');

// @desc    Get current logged-in patient's own EHR record
// @route   GET /api/ehr
// @access  Private (Patient only)
exports.getOwnEhr = async (req, res) => {
  try {
    let ehr = await EhrRecord.findOne({ patient: req.user.id });

    // If no record exists, dynamically create a blank template
    if (!ehr) {
      ehr = await EhrRecord.create({
        patient: req.user.id,
        bloodGroup: '',
        allergies: [],
        chronicDiseases: [],
        previousSurgeries: [],
        currentMedicines: [],
        vaccinationHistory: [],
        familyHistory: '',
        emergencyContact: { name: '', relationship: '', phone: '' },
      });
    }

    res.status(200).json({
      success: true,
      data: ehr,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update or create current patient's EHR record
// @route   PUT /api/ehr
// @access  Private (Patient only)
exports.updateOwnEhr = async (req, res) => {
  try {
    const {
      bloodGroup,
      allergies,
      chronicDiseases,
      previousSurgeries,
      currentMedicines,
      vaccinationHistory,
      familyHistory,
      emergencyContact,
    } = req.body;

    let ehr = await EhrRecord.findOne({ patient: req.user.id });

    if (!ehr) {
      ehr = new EhrRecord({ patient: req.user.id });
    }

    ehr.bloodGroup = bloodGroup !== undefined ? bloodGroup : ehr.bloodGroup;
    ehr.allergies = allergies !== undefined ? allergies : ehr.allergies;
    ehr.chronicDiseases = chronicDiseases !== undefined ? chronicDiseases : ehr.chronicDiseases;
    ehr.previousSurgeries = previousSurgeries !== undefined ? previousSurgeries : ehr.previousSurgeries;
    ehr.currentMedicines = currentMedicines !== undefined ? currentMedicines : ehr.currentMedicines;
    ehr.vaccinationHistory = vaccinationHistory !== undefined ? vaccinationHistory : ehr.vaccinationHistory;
    ehr.familyHistory = familyHistory !== undefined ? familyHistory : ehr.familyHistory;
    ehr.emergencyContact = emergencyContact !== undefined ? emergencyContact : ehr.emergencyContact;

    await ehr.save();

    res.status(200).json({
      success: true,
      message: 'EHR profile updated successfully',
      data: ehr,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get a specific patient's EHR record (for doctors or admins)
// @route   GET /api/ehr/patient/:patientUserId
// @access  Private (Doctor/Admin only)
exports.getPatientEhr = async (req, res) => {
  try {
    const patientUserId = req.params.patientUserId;

    // Verify patient user exists
    const patientUser = await User.findById(patientUserId);
    if (!patientUser) {
      return res.status(404).json({ success: false, error: 'Patient account not found' });
    }

    let ehr = await EhrRecord.findOne({ patient: patientUserId });
    
    // Create a default if it doesn't exist yet
    if (!ehr) {
      ehr = await EhrRecord.create({
        patient: patientUserId,
        bloodGroup: '',
        allergies: [],
        chronicDiseases: [],
        previousSurgeries: [],
        currentMedicines: [],
        vaccinationHistory: [],
        familyHistory: '',
        emergencyContact: { name: '', relationship: '', phone: '' },
      });
    }

    res.status(200).json({
      success: true,
      data: ehr,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
