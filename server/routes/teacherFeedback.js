const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const {
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    listSemesters,
    createSemester,
    updateSemester,
    deleteSemester,
    listTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    listCriteria,
    createCriteria,
    updateCriteria,
    deleteCriteria,
    getActiveCriteria,
    getAssignedTeachers,
    submitFeedback,
    checkSubmission,
    getTeacherReport,
    getDepartmentReport,
    getSemesterReport,
    getOverview
} = require('../controllers/teacherFeedbackController');

router.get('/overview', authMiddleware, isAdmin, getOverview);

router.get('/departments', listDepartments);
router.post('/departments', authMiddleware, isAdmin, createDepartment);
router.put('/departments/:id', authMiddleware, isAdmin, updateDepartment);
router.delete('/departments/:id', authMiddleware, isAdmin, deleteDepartment);

router.get('/semesters', listSemesters);
router.post('/semesters', authMiddleware, isAdmin, createSemester);
router.put('/semesters/:id', authMiddleware, isAdmin, updateSemester);
router.delete('/semesters/:id', authMiddleware, isAdmin, deleteSemester);

router.get('/teachers', listTeachers);
router.get('/teachers/assigned', authMiddleware, getAssignedTeachers);
router.post('/teachers', authMiddleware, isAdmin, createTeacher);
router.put('/teachers/:id', authMiddleware, isAdmin, updateTeacher);
router.delete('/teachers/:id', authMiddleware, isAdmin, deleteTeacher);

router.get('/criteria', listCriteria);
router.get('/criteria/active', getActiveCriteria);
router.post('/criteria', authMiddleware, isAdmin, createCriteria);
router.put('/criteria/:id', authMiddleware, isAdmin, updateCriteria);
router.delete('/criteria/:id', authMiddleware, isAdmin, deleteCriteria);

router.post('/submissions', authMiddleware, submitFeedback);
router.get('/submissions/check', authMiddleware, checkSubmission);

router.get('/reports/teacher/:teacherId', authMiddleware, isAdmin, getTeacherReport);
router.get('/reports/department/:departmentId', authMiddleware, isAdmin, getDepartmentReport);
router.get('/reports/semester/:semesterNumber', authMiddleware, isAdmin, getSemesterReport);

module.exports = router;