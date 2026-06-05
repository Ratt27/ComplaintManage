const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const TeacherFeedback = require('../models/TeacherFeedback');
const FeedbackCriteria = require('../models/FeedbackCriteria');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');


const toTitleMap = (items) => items.reduce((accumulator, item) => {
    accumulator[item._id.toString()] = item.title;
    return accumulator;
}, {});

// Submit feedback (after complaint resolved)
const submitFeedback = async (req, res) => {
    try {
        const { complaintId, rating, comment } = req.body;
        // Find complaint and ensure it's resolved
        const complaint = await Complaint.findById(complaintId);
        if (!complaint || complaint.status !== 'resolved') {
            return res.status(400).json({ message: 'Feedback can only be submitted for resolved complaints.' });
        }
        // Only allow feedback if user is the complaint owner
        if (complaint.raisedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to submit feedback for this complaint.' });
        }
        // Prevent duplicate feedback
        const existing = await Feedback.findOne({ complaintId, userId: req.user.id });
        if (existing) {
            return res.status(400).json({ message: 'Feedback already submitted for this complaint.' });
        }
        const feedback = new Feedback({
            complaintId,
            userId: req.user.id,
            staffId: complaint.assignedTo,
            rating,
            comment
        });
        await feedback.save();
        res.status(201).json({ message: 'Feedback submitted', feedback });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all feedbacks (public)
const getAllFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('userId', 'name email')
            .populate('staffId', 'name email')
            .populate('complaintId', 'title');
        res.json(feedbacks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getTeacherStatus = async (req, res) => {
    try {
        const { teacherId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(teacherId)) {
            return res.status(400).json({ message: 'Invalid teacher id' });
        }

        const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

        // Find the User document first to resolve email
        const user = await User.findById(teacherObjectId);
        let queryTeacherId = teacherObjectId;

        if (user) {
            // Find the matching Teacher record by email or name (case-insensitive)
            const teacherDoc = await Teacher.findOne({
                $or: [
                    { email: user.email },
                    { name: { $regex: new RegExp("^" + user.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i") } }
                ]
            });
            if (teacherDoc) {
                queryTeacherId = teacherDoc._id;
            }
        }

        const [teacherFeedbacks, criteria] = await Promise.all([
            TeacherFeedback.find({ teacherId: queryTeacherId }).populate('departmentId', 'name').sort({ createdAt: -1 }),
            FeedbackCriteria.find({ isActive: true }).sort({ sortOrder: 1, title: 1 })
        ]);

        const totalFeedbacks = teacherFeedbacks.length;
        const allRatings = teacherFeedbacks.flatMap((feedback) => feedback.ratings || []);
        const overallAverage = allRatings.length
            ? allRatings.reduce((sum, rating) => sum + Number(rating.score || 0), 0) / allRatings.length
            : 0;

        const criterionMap = new Map();
        const departmentMap = new Map();
        const semesterMap = new Map();

        for (const feedback of teacherFeedbacks) {
            const feedbackAverage = (feedback.ratings || []).length
                ? feedback.ratings.reduce((sum, rating) => sum + Number(rating.score || 0), 0) / feedback.ratings.length
                : 0;

            const departmentKey = feedback.departmentId?._id?.toString() || feedback.departmentId?.toString() || 'unknown';
            const departmentName = feedback.departmentId?.name || 'Department';
            const semesterKey = String(feedback.semester);

            const departmentEntry = departmentMap.get(departmentKey) || {
                departmentId: departmentKey,
                departmentName,
                totalRatings: 0,
                scoreSum: 0
            };
            departmentEntry.totalRatings += 1;
            departmentEntry.scoreSum += feedbackAverage;
            departmentMap.set(departmentKey, departmentEntry);

            const semesterEntry = semesterMap.get(semesterKey) || {
                semester: feedback.semester,
                totalRatings: 0,
                scoreSum: 0
            };
            semesterEntry.totalRatings += 1;
            semesterEntry.scoreSum += feedbackAverage;
            semesterMap.set(semesterKey, semesterEntry);

            for (const rating of feedback.ratings || []) {
                const criteriaKey = rating.criteriaId?.toString();
                if (!criteriaKey) continue;

                const criterionEntry = criterionMap.get(criteriaKey) || {
                    criteriaId: criteriaKey,
                    totalRatings: 0,
                    scoreSum: 0
                };
                criterionEntry.totalRatings += 1;
                criterionEntry.scoreSum += Number(rating.score || 0);
                criterionMap.set(criteriaKey, criterionEntry);
            }
        }

        const criterionTitles = new Map(criteria.map((item) => [item._id.toString(), item.title]));

        res.json({
            totalFeedbacks,
            overallAverage: Number(overallAverage.toFixed(2)),
            criterionWiseRatings: Array.from(criterionMap.values()).map((item) => ({
                criteriaId: item.criteriaId,
                title: criterionTitles.get(item.criteriaId) || 'Criterion',
                averageRating: Number((item.scoreSum / item.totalRatings).toFixed(2)),
                totalRatings: item.totalRatings
            })),
            departmentWiseRatings: Array.from(departmentMap.values()).map((item) => ({
                departmentId: item.departmentId,
                departmentName: item.departmentName,
                averageRating: Number((item.scoreSum / item.totalRatings).toFixed(2)),
                totalRatings: item.totalRatings
            })),
            semesterWiseRatings: Array.from(semesterMap.values()).map((item) => ({
                semester: item.semester,
                averageRating: Number((item.scoreSum / item.totalRatings).toFixed(2)),
                totalRatings: item.totalRatings
            }))
        });
    } catch (error) {
        console.error('[getTeacherStatus] error:', error.message || error);
        res.status(500).json({ message: 'Failed to fetch teacher feedback status' });
    }
};

module.exports = { submitFeedback, getAllFeedbacks, getTeacherStatus };