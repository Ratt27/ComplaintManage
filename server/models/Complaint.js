const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
{
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    imageUrl: {
        type: String,
        default: ''
    },

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    department: {
        type: String,
        required: true,
        trim: true
    },

    assignedTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved'],
        default: 'pending'
    },

    category: {
        type: String,
        required: true,
        trim: true
    },

    dueInDays: {
        type: Number,
        required: true,
        enum: [1, 2, 3],
        default: 3
    },

    // Legacy compatibility
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    resolutionNotes: {
        type: String,
        default: ''
    },

    date: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    },

    staffUpdates: [
        {
            status: {
                type: String,
                enum: ['pending', 'in-progress', 'resolved'],
                default: 'in-progress'
            },

            photoUrl: {
                type: String,
                default: ''
            },

            remarks: {
                type: String,
                required: true
            },

            updatedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },

            updatedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
},
{
    timestamps: true
}
);

// Sync old and new fields
complaintSchema.pre('validate', function (next) {

    // student <-> raisedBy
    if (!this.student && this.raisedBy) {
        this.student = this.raisedBy;
    }

    if (!this.raisedBy && this.student) {
        this.raisedBy = this.student;
    }

    // assignedTeacher <-> assignedTo
    if (!this.assignedTeacher && this.assignedTo) {
        this.assignedTeacher = this.assignedTo;
    }

    if (!this.assignedTo && this.assignedTeacher) {
        this.assignedTo = this.assignedTeacher;
    }

    next();
});

module.exports = mongoose.model('Complaint', complaintSchema);