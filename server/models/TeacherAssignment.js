const mongoose = require('mongoose');

const teacherAssignmentSchema = new mongoose.Schema(
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
        }
    },
    { timestamps: true }
);

teacherAssignmentSchema.index({ teacherId: 1, departmentId: 1, semester: 1 }, { unique: true });
module.exports = mongoose.model('TeacherAssignment', teacherAssignmentSchema);

