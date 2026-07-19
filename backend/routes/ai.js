const express = require('express');
const { check } = require('express-validator');
const { analyzeSymptoms, chatWithAi, scanReport } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect); // Secure endpoints

router.post(
  '/analyze-symptoms',
  [
    check('symptoms', 'Symptoms description is required').not().isEmpty(),
    validate,
  ],
  analyzeSymptoms
);

router.post('/chat', chatWithAi);
router.post('/scan-report', upload.single('report'), scanReport);

module.exports = router;
