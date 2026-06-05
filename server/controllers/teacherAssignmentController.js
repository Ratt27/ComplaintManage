const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const TeacherAssignment = require('../models/TeacherAssignment');

const isActiveTeacher = (teacher) => teacher && teacher.role === 'staff' && teacher.active !== false;

const getActiveTeachers = async (_req, res) => {
    try {
        const teachers = await User.find({
            role: 'staff',
            $or: [{ active: true }, { active: { $exists: false } }]
        })
            .select('_id name email department active')
            .sort({ name: 1 });

        res.json(teachers);
    } catch (error) {
        console.error('[teacherAssignment] getActiveTeachers failed:', error.message);
        res.status(500).json({ message: 'Failed to fetch active teachers' });
    }
};

const assignTeacher = async (req, res) => {
    try {
        const { teacherId, departmentId, semesterNumber } = req.body;
        const semester = Number(semesterNumber);

        if (!mongoose.Types.ObjectId.isValid(teacherId) || !mongoose.Types.ObjectId.isValid(departmentId) || !Number.isInteger(semester)) {
            return res.status(400).json({ message: 'teacherId, departmentId and semesterNumber are required' });
        }

        const [teacher, department, semesterDoc] = await Promise.all([
            User.findById(teacherId),
            Department.findById(departmentId),
            Semester.findOne({ semesterNumber: semester })
        ]);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        if (!isActiveTeacher(teacher)) {
            return res.status(400).json({ message: 'Teacher is inactive' });
        }
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }
        if (!semesterDoc) {
            return res.status(404).json({ message: 'Semester not found' });
        }

        const existing = await TeacherAssignment.findOne({ teacherId, departmentId, semesterNumber: semester });
        if (existing) {
            return res.status(400).json({ message: 'Duplicate assignment is not allowed' });
        }

        const assignment = await TeacherAssignment.create({
            teacherId,
            departmentId,
            semesterNumber: semester
        });

        const populated = await TeacherAssignment.findById(assignment._id)
            .populate('teacherId', 'name email department active')
            .populate('departmentId', 'name');

        res.status(201).json(populated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate assignment is not allowed' });
        }
        console.error('[teacherAssignment] assignTeacher failed:', error.message);
        res.status(500).json({ message: 'Failed to assign teacher' });
    }
};

const getAssignedTeachers = async (req, res) => {
    try {
        const departmentId = req.query.departmentId;
        const semester = Number(req.query.semesterNumber || req.query.semester);

        if (!mongoose.Types.ObjectId.isValid(departmentId) || !Number.isInteger(semester)) {
            return res.status(400).json({ message: 'Valid departmentId and semesterNumber are required' });
        }

        const assignments = await TeacherAssignment.find({ departmentId, semesterNumber: semester })
            .populate('teacherId', 'name email department active')
            .populate('departmentId', 'name')
            .sort({ createdAt: -1 });

        res.json(assignments.filter((assignment) => isActiveTeacher(assignment.teacherId)));
    } catch (error) {
        console.error('[teacherAssignment] getAssignedTeachers failed:', error.message);
        res.status(500).json({ message: 'Failed to fetch assigned teachers' });
    }
};

module.exports = {
    getActiveTeachers,
    assignTeacher,
    getAssignedTeachers
};
