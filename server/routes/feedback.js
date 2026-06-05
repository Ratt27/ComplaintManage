const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { submitFeedback, getAllFeedbacks, getTeacherStatus } = require('../controllers/feedbackController');

// Submit feedback (user, after complaint resolved)
router.post('/', authMiddleware, submitFeedback);
// Get all feedbacks (public)
router.get('/', getAllFeedbacks);
router.get('/teacher-status/:teacherId', authMiddleware, getTeacherStatus);

module.exports = router; 