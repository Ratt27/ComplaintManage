const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const { assignTeacher, getAssignedTeachers } = require('../controllers/teacherAssignmentsController');

router.post('/', authMiddleware, isAdmin, assignTeacher);
router.get('/assigned', authMiddleware, getAssignedTeachers);
router.get('/', authMiddleware, getAssignedTeachers);

module.exports = router;

