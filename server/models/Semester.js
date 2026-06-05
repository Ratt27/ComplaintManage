const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
    {
        semesterNumber: {
            type: Number,
            required: true,
            unique: true,
            min: 1
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Semester', semesterSchema);