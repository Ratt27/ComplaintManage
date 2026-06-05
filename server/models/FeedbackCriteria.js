const mongoose = require('mongoose');

const feedbackCriteriaSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        description: {
            type: String,
            default: ''
        },
        isActive: {
            type: Boolean,
            default: true
        },
        sortOrder: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('FeedbackCriteria', feedbackCriteriaSchema);