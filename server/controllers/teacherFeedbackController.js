const mongoose = require('mongoose');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Teacher = require('../models/Teacher');
const FeedbackCriteria = require('../models/FeedbackCriteria');
const TeacherFeedback = require('../models/TeacherFeedback');

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const normalizeNumberArray = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
    }

    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item));
            }
        } catch (error) {
            return value
                .split(',')
                .map((item) => Number(item.trim()))
                .filter((item) => Number.isFinite(item));
        }
    }

    return [];
};

const normalizeRatings = (value) => {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    return [];
};

const getEntities = async (Model, res) => {
    const items = await Model.find().sort({ createdAt: -1 });
    res.json(items);
};

const createEntity = async (Model, payload, res) => {
    const item = await Model.create(payload);
    res.status(201).json(item);
};

const updateEntity = async (Model, id, payload, res) => {
    const item = await Model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!item) {
        return res.status(404).json({ message: 'Record not found' });
    }
    res.json(item);
};

const deleteEntity = async (Model, id, res) => {
    const item = await Model.findByIdAndDelete(id);
    if (!item) {
        return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ message: 'Deleted successfully' });
};

const listDepartments = async (req, res) => getEntities(Department, res);

const createDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ message: 'Department name is required' });
        }
        await createEntity(Department, { name: name.trim() }, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        await updateEntity(Department, req.params.id, { name: name?.trim() }, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteDepartment = async (req, res) => deleteEntity(Department, req.params.id, res);

const listSemesters = async (req, res) => getEntities(Semester, res);

const createSemester = async (req, res) => {
    try {
        const semesterNumber = Number(req.body.semesterNumber);
        if (!Number.isInteger(semesterNumber) || semesterNumber < 1) {
            return res.status(400).json({ message: 'Semester number must be a positive integer' });
        }
        await createEntity(Semester, { semesterNumber }, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateSemester = async (req, res) => {
    try {
        const semesterNumber = Number(req.body.semesterNumber);
        if (!Number.isInteger(semesterNumber) || semesterNumber < 1) {
            return res.status(400).json({ message: 'Semester number must be a positive integer' });
        }
        await updateEntity(Semester, req.params.id, { semesterNumber }, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteSemester = async (req, res) => deleteEntity(Semester, req.params.id, res);

const listTeachers = async (req, res) => {
    const teachers = await Teacher.find()
        .populate('departmentId', 'name')
        .sort({ createdAt: -1 });
    res.json(teachers);
};

const createTeacher = async (req, res) => {
    try {
        const { name, departmentId, semesters, designation, email } = req.body;

        if (!name?.trim() || !departmentId) {
            return res.status(400).json({ message: 'Teacher name and department are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(departmentId)) {
            return res.status(400).json({ message: 'Invalid department' });
        }

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const semesterValues = normalizeNumberArray(semesters);
        if (semesterValues.length === 0) {
            return res.status(400).json({ message: 'Assign at least one semester' });
        }

        await createEntity(
            Teacher,
            {
                name: name.trim(),
                departmentId,
                semesters: semesterValues,
                designation: designation?.trim() || '',
                email: email?.trim() || ''
            },
            res
        );
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateTeacher = async (req, res) => {
    try {
        const payload = {};

        if (req.body.name !== undefined) {
            payload.name = req.body.name.trim();
        }

        if (req.body.departmentId) {
            if (!mongoose.Types.ObjectId.isValid(req.body.departmentId)) {
                return res.status(400).json({ message: 'Invalid department' });
            }
            const department = await Department.findById(req.body.departmentId);
            if (!department) {
                return res.status(404).json({ message: 'Department not found' });
            }
            payload.departmentId = req.body.departmentId;
        }

        if (req.body.semesters !== undefined) {
            const semesterValues = normalizeNumberArray(req.body.semesters);
            if (semesterValues.length === 0) {
                return res.status(400).json({ message: 'Assign at least one semester' });
            }
            payload.semesters = semesterValues;
        }

        if (req.body.designation !== undefined) {
            payload.designation = req.body.designation?.trim() || '';
        }

        if (req.body.email !== undefined) {
            payload.email = req.body.email?.trim() || '';
        }

        await updateEntity(Teacher, req.params.id, payload, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteTeacher = async (req, res) => deleteEntity(Teacher, req.params.id, res);

const listCriteria = async (req, res) => {
    const criteria = await FeedbackCriteria.find().sort({ sortOrder: 1, createdAt: 1 });
    res.json(criteria);
};

const createCriteria = async (req, res) => {
    try {
        const { title, description, isActive, sortOrder } = req.body;
        if (!title?.trim()) {
            return res.status(400).json({ message: 'Criteria title is required' });
        }

        await createEntity(
            FeedbackCriteria,
            {
                title: title.trim(),
                description: description?.trim() || '',
                isActive: isActive !== undefined ? isActive === true || isActive === 'true' : true,
                sortOrder: Number(sortOrder) || 0
            },
            res
        );
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateCriteria = async (req, res) => {
    try {
        const payload = {};
        if (req.body.title !== undefined) {
            payload.title = req.body.title.trim();
        }
        if (req.body.description !== undefined) {
            payload.description = req.body.description?.trim() || '';
        }
        if (req.body.isActive !== undefined) {
            payload.isActive = req.body.isActive === true || req.body.isActive === 'true';
        }
        if (req.body.sortOrder !== undefined) {
            payload.sortOrder = Number(req.body.sortOrder) || 0;
        }
        await updateEntity(FeedbackCriteria, req.params.id, payload, res);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteCriteria = async (req, res) => deleteEntity(FeedbackCriteria, req.params.id, res);

const getActiveCriteria = async (req, res) => {
    const criteria = await FeedbackCriteria.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
    res.json(criteria);
};

const getAssignedTeachers = async (req, res) => {
    try {
        const departmentId = req.query.departmentId;
        const semester = Number(req.query.semester);

        if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
            return res.status(400).json({ message: 'Valid departmentId is required' });
        }

        if (!Number.isInteger(semester) || semester < 1) {
            return res.status(400).json({ message: 'Valid semester is required' });
        }

        const teachers = await Teacher.find({
            departmentId: toObjectId(departmentId),
            semesters: semester
        }).populate('departmentId', 'name');

        res.json(teachers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const submitFeedback = async (req, res) => {
    try {
        if (req.user?.role !== 'student') {
            return res.status(403).json({ message: 'Only students can submit feedback' });
        }

        const { teacherId, departmentId } = req.body;
        const semester = Number(req.body.semester);
        const ratings = normalizeRatings(req.body.ratings);

        if (!teacherId || !departmentId || !mongoose.Types.ObjectId.isValid(teacherId) || !mongoose.Types.ObjectId.isValid(departmentId)) {
            return res.status(400).json({ message: 'Teacher and department are required' });
        }

        if (!Number.isInteger(semester) || semester < 1) {
            return res.status(400).json({ message: 'Semester is required' });
        }

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        if (teacher.departmentId.toString() !== departmentId.toString() || !teacher.semesters.includes(semester)) {
            return res.status(400).json({ message: 'Teacher is not assigned to the selected department and semester' });
        }

        const activeCriteria = await FeedbackCriteria.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
        if (activeCriteria.length === 0) {
            return res.status(400).json({ message: 'No active feedback criteria found' });
        }

        const criteriaIds = activeCriteria.map((criterion) => criterion._id.toString());
        const normalizedRatings = ratings.map((rating) => ({
            criteriaId: rating.criteriaId,
            score: Number(rating.score)
        }));

        const providedCriteriaIds = normalizedRatings.map((rating) => rating.criteriaId?.toString());
        const hasAllCriteria = criteriaIds.length === providedCriteriaIds.length && criteriaIds.every((criteriaId) => providedCriteriaIds.includes(criteriaId));

        if (!hasAllCriteria) {
            return res.status(400).json({ message: 'Ratings must be submitted for every active criterion' });
        }

        const invalidRating = normalizedRatings.find((rating) => !Number.isInteger(rating.score) || rating.score < 1 || rating.score > 5 || !mongoose.Types.ObjectId.isValid(rating.criteriaId));
        if (invalidRating) {
            return res.status(400).json({ message: 'Ratings must use values between 1 and 5' });
        }

        const duplicate = await TeacherFeedback.findOne({
            teacherId,
            studentId: req.user.id,
            semester
        });

        if (duplicate) {
            return res.status(400).json({ message: 'You have already submitted feedback for this teacher this semester' });
        }

        const feedback = await TeacherFeedback.create({
            teacherId,
            departmentId,
            semester,
            studentId: req.user.id,
            ratings: normalizedRatings.map((rating) => ({
                criteriaId: rating.criteriaId,
                score: rating.score
            }))
        });

        res.status(201).json({
            message: 'Feedback submitted successfully',
            feedbackId: feedback._id
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate feedback submission is not allowed' });
        }
        console.error('[submitFeedback]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const checkSubmission = async (req, res) => {
    try {
        const teacherId = req.query.teacherId;
        const semester = Number(req.query.semester);

        if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId) || !Number.isInteger(semester)) {
            return res.status(400).json({ message: 'Valid teacherId and semester are required' });
        }

        const existing = await TeacherFeedback.findOne({
            teacherId,
            semester,
            studentId: req.user.id
        });

        res.json({ submitted: !!existing });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getTeacherReport = async (req, res) => {
    try {
        const { teacherId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(teacherId)) {
            return res.status(400).json({ message: 'Invalid teacher id' });
        }

        const teacher = await Teacher.findById(teacherId).populate('departmentId', 'name');
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        const criteriaScores = await TeacherFeedback.aggregate([
            { $match: { teacherId: toObjectId(teacherId) } },
            { $unwind: '$ratings' },
            {
                $group: {
                    _id: '$ratings.criteriaId',
                    averageScore: { $avg: '$ratings.score' },
                    totalResponses: { $sum: 1 }
                }
            },
            { $sort: { averageScore: -1 } }
        ]);

        const overallAverage = await TeacherFeedback.aggregate([
            { $match: { teacherId: toObjectId(teacherId) } },
            { $unwind: '$ratings' },
            {
                $group: {
                    _id: null,
                    averageScore: { $avg: '$ratings.score' }
                }
            }
        ]);

        const totalFeedbacks = await TeacherFeedback.countDocuments({ teacherId: toObjectId(teacherId) });
        const criteriaDocs = await FeedbackCriteria.find({ _id: { $in: criteriaScores.map((item) => item._id) } });
        const criteriaLookup = criteriaDocs.reduce((accumulator, criterion) => {
            accumulator[criterion._id.toString()] = criterion;
            return accumulator;
        }, {});

        res.json({
            teacher,
            totalFeedbacks,
            overallAverage: overallAverage[0]?.averageScore || 0,
            criteria: criteriaScores.map((item) => ({
                criteriaId: item._id,
                title: criteriaLookup[item._id.toString()]?.title || 'Criterion',
                averageScore: Number(item.averageScore.toFixed(2)),
                totalResponses: item.totalResponses
            }))
        });
    } catch (error) {
        console.error('[getTeacherReport]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getDepartmentReport = async (req, res) => {
    try {
        const { departmentId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(departmentId)) {
            return res.status(400).json({ message: 'Invalid department id' });
        }

        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        const teachers = await Teacher.find({ departmentId: toObjectId(departmentId) });
        const teacherIds = teachers.map((teacher) => teacher._id);

        const teacherAverages = await TeacherFeedback.aggregate([
            { $match: { teacherId: { $in: teacherIds } } },
            { $unwind: '$ratings' },
            {
                $group: {
                    _id: '$teacherId',
                    averageScore: { $avg: '$ratings.score' },
                    totalFeedbacks: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    averageScore: 1,
                    totalFeedbacks: { $size: '$totalFeedbacks' }
                }
            },
            { $sort: { averageScore: -1 } }
        ]);

        const teacherLookup = teachers.reduce((accumulator, teacher) => {
            accumulator[teacher._id.toString()] = teacher;
            return accumulator;
        }, {});

        const overallAverage = await TeacherFeedback.aggregate([
            { $match: { teacherId: { $in: teacherIds } } },
            { $unwind: '$ratings' },
            {
                $group: {
                    _id: null,
                    averageScore: { $avg: '$ratings.score' }
                }
            }
        ]);

        res.json({
            department,
            overallAverage: overallAverage[0]?.averageScore || 0,
            teacherAverages: teacherAverages.map((item) => ({
                teacherId: item._id,
                name: teacherLookup[item._id.toString()]?.name || 'Teacher',
                averageScore: Number(item.averageScore.toFixed(2)),
                totalFeedbacks: item.totalFeedbacks
            })),
            highestRatedTeacher: teacherAverages[0]
                ? {
                    teacherId: teacherAverages[0]._id,
                    name: teacherLookup[teacherAverages[0]._id.toString()]?.name || 'Teacher',
                    averageScore: Number(teacherAverages[0].averageScore.toFixed(2))
                }
                : null
        });
    } catch (error) {
        console.error('[getDepartmentReport]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getSemesterReport = async (req, res) => {
    try {
        const semester = Number(req.params.semesterNumber);
        if (!Number.isInteger(semester)) {
            return res.status(400).json({ message: 'Invalid semester number' });
        }

        const teacherAverages = await TeacherFeedback.aggregate([
            { $match: { semester } },
            { $unwind: '$ratings' },
            {
                $group: {
                    _id: '$teacherId',
                    averageScore: { $avg: '$ratings.score' },
                    totalFeedbacks: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    averageScore: 1,
                    totalFeedbacks: { $size: '$totalFeedbacks' }
                }
            },
            { $sort: { averageScore: -1 } }
        ]);

        const teachers = await Teacher.find({ _id: { $in: teacherAverages.map((item) => item._id) } });
        const teacherLookup = teachers.reduce((accumulator, teacher) => {
            accumulator[teacher._id.toString()] = teacher;
            return accumulator;
        }, {});

        const overallAverage = await TeacherFeedback.aggregate([
            { $match: { semester } },
            { $unwind: '$ratings' },
            {
                $group: {
                    _id: null,
                    averageScore: { $avg: '$ratings.score' }
                }
            }
        ]);

        res.json({
            semester,
            overallAverage: overallAverage[0]?.averageScore || 0,
            teacherRankings: teacherAverages.map((item, index) => ({
                rank: index + 1,
                teacherId: item._id,
                name: teacherLookup[item._id.toString()]?.name || 'Teacher',
                averageScore: Number(item.averageScore.toFixed(2)),
                totalFeedbacks: item.totalFeedbacks
            }))
        });
    } catch (error) {
        console.error('[getSemesterReport]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getOverview = async (req, res) => {
    try {
        const [departments, semesters, teachers, criteria, feedbacks] = await Promise.all([
            Department.countDocuments(),
            Semester.countDocuments(),
            Teacher.countDocuments(),
            FeedbackCriteria.countDocuments(),
            TeacherFeedback.countDocuments()
        ]);

        const topTeachers = await TeacherFeedback.aggregate([
            { $unwind: '$ratings' },
            {
                $group: {
                    _id: '$teacherId',
                    averageScore: { $avg: '$ratings.score' },
                    totalFeedbacks: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    averageScore: 1,
                    totalFeedbacks: { $size: '$totalFeedbacks' }
                }
            },
            { $sort: { averageScore: -1 } },
            { $limit: 5 }
        ]);

        const teachersDocs = await Teacher.find({ _id: { $in: topTeachers.map((item) => item._id) } });
        const teacherLookup = teachersDocs.reduce((accumulator, teacher) => {
            accumulator[teacher._id.toString()] = teacher;
            return accumulator;
        }, {});

        res.json({
            counts: { departments, semesters, teachers, criteria, feedbacks },
            topTeachers: topTeachers.map((item) => ({
                teacherId: item._id,
                name: teacherLookup[item._id.toString()]?.name || 'Teacher',
                averageScore: Number(item.averageScore.toFixed(2)),
                totalFeedbacks: item.totalFeedbacks
            }))
        });
    } catch (error) {
        console.error('[getOverview]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
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
};