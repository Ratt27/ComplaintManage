const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        },
        semesters: [
            {
                type: Number,
                required: true,
                min: 1
            }
        ],
        designation: {
            type: String,
            default: ''
        },
        email: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Teacher', teacherSchema);