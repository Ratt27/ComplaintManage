const mongoose = require('mongoose');

const teacherFeedbackSchema = new mongoose.Schema(
    {
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        },
        semester: {
            type: Number,
            required: true,
            min: 1
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            select: false
        },
        ratings: [
            {
                criteriaId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'FeedbackCriteria',
                    required: true
                },
                score: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 5
                }
            }
        ]
    },
    { timestamps: true }
);

teacherFeedbackSchema.index({ teacherId: 1, semester: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('TeacherFeedback', teacherFeedbackSchema);