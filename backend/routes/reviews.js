const express = require('express');
const { addReview, getReviewsForDoctor } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('patient'), addReview);
router.get('/doctor/:doctorUserId', getReviewsForDoctor);

module.exports = router;
