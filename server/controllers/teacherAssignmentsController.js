const Department = require('../models/Department');
const User = require('../models/User');
const TeacherAssignment = require('../models/TeacherAssignment');

const assignTeacher = async (req, res) => {
    try {
        const { teacherId, departmentId, semester } = req.body;

        if (!teacherId || !departmentId || !semester) {
            return res.status(400).json({ message: 'Teacher, department and semester are required' });
        }

        const semesterNumber = Number(semester);
        if (!Number.isInteger(semesterNumber) || semesterNumber < 1) {
            return res.status(400).json({ message: 'Semester must be a positive number' });
        }

        const teacher = await User.findOne({
            _id: teacherId,
            role: 'staff',
            $or: [{ active: true }, { active: { $exists: false } }]
        });

        if (!teacher) {
            return res.status(400).json({ message: 'Teacher does not exist or is inactive' });
        }

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const existing = await TeacherAssignment.findOne({
            teacherId,
            departmentId,
            semester: semesterNumber
        });

        if (existing) {
            return res.status(400).json({ message: 'This teacher is already assigned to the selected department and semester' });
        }

        const assignment = await TeacherAssignment.create({
            teacherId,
            departmentId,
            semester: semesterNumber
        });

        res.status(201).json(assignment);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This teacher is already assigned to the selected department and semester' });
        }
        console.error('[teacherAssignmentsController] assignTeacher failed:', error.message);
        res.status(500).json({ message: 'Unable to assign teacher' });
    }
};

const getAssignedTeachers = async (req, res) => {
    try {
        const { departmentId, semester } = req.query;
        const semesterNumber = Number(semester);

        if (!departmentId || !semester || !Number.isInteger(semesterNumber)) {
            return res.status(400).json({ message: 'departmentId and semester are required' });
        }

        const assignments = await TeacherAssignment.find({
            departmentId,
            semester: semesterNumber
        }).populate('teacherId', 'name email department active');

        res.json(assignments.map((assignment) => assignment.teacherId).filter(Boolean));
    } catch (error) {
        console.error('[teacherAssignmentsController] getAssignedTeachers failed:', error.message);
        res.status(500).json({ message: 'Unable to fetch assigned teachers' });
    }
};

module.exports = { assignTeacher, getAssignedTeachers };