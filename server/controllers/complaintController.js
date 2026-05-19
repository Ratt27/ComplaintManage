const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { sendResolutionEmail } = require('../utils/mailer');

// ===============================
// CREATE COMPLAINT
// ===============================
const createComplaint = async (req, res) => {
    try {
        console.log('[createComplaint] payload:', req.body);

        const { title, description, category, dueInDays } = req.body;

        const imageUrl = req.file
            ? `/uploads/${req.file.filename}`
            : '';

        const studentUser = await User.findById(req.user.id).select(
            'department name email role'
        );

        if (!studentUser) {
            return res.status(404).json({
                message: 'Student profile not found.'
            });
        }

        const complaint = new Complaint({
            title,
            description,
            category,
            dueInDays,
            imageUrl,
            student: req.user.id,
            raisedBy: req.user.id,
            department: studentUser.department,
            status: 'pending'
        });

        await complaint.save();

        const populatedComplaint = await Complaint.findById(complaint._id)
            .populate('student', 'name email department')
            .populate('assignedTeacher', 'name email department');

        console.log(
            '[createComplaint] created complaint:',
            complaint._id
        );

        res.status(201).json({
            message: 'Complaint submitted successfully',
            complaint: populatedComplaint
        });

    } catch (error) {
        console.error('[createComplaint] error:', error);

        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// ===============================
// GET MY COMPLAINTS
// ===============================
const getMyComplaints = async (req, res) => {
    try {

        const complaints = await Complaint.find({
            $or: [
                { student: req.user.id },
                { raisedBy: req.user.id }
            ]
        })
            .populate('student', 'name email department')
            .populate('assignedTeacher', 'name email department')
            .sort({ date: -1 });

        console.log(
            '[getMyComplaints] user:',
            req.user.id,
            'count:',
            complaints.length
        );

        res.json(complaints);

    } catch (error) {
        console.error('[getMyComplaints] error:', error);

        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// ===============================
// GET SINGLE COMPLAINT
// ===============================
const getComplaintById = async (req, res) => {
    try {

        const complaint = await Complaint.findById(req.params.id)
            .populate('student', 'name email department')
            .populate('assignedTeacher', 'name email department');

        if (!complaint) {
            return res.status(404).json({
                message: 'Complaint not found'
            });
        }

        console.log(
            '[getComplaintById] complaintId:',
            req.params.id
        );

        res.json(complaint);

    } catch (error) {
        console.error('[getComplaintById] error:', error);

        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// ===============================
// ADMIN - GET ALL COMPLAINTS
// ===============================
const getAllComplaints = async (req, res) => {
    try {

        console.log(
            '[getAllComplaints] admin user:',
            req.user.id
        );

        const complaints = await Complaint.find()
            .populate('student', 'email name department')
            .populate('assignedTeacher', 'email name department')
            .sort({ date: -1 });

        const pending = complaints
            .filter(c => c.status === 'pending')
            .sort((a, b) => a.dueInDays - b.dueInDays);

        const inProgress = complaints
            .filter(c => c.status === 'in-progress')
            .sort((a, b) => a.dueInDays - b.dueInDays);

        const resolved = complaints.filter(
            c => c.status === 'resolved'
        );

        console.log('[getAllComplaints] counts:', {
            total: complaints.length,
            pending: pending.length,
            inProgress: inProgress.length,
            resolved: resolved.length
        });

        res.json({
            pending,
            inProgress,
            resolved
        });

    } catch (error) {
        console.error('[getAllComplaints] error:', error);

        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// ===============================
// ADMIN - ASSIGN COMPLAINT
// ===============================
const assignComplaint = async (req, res) => {
    try {

        const { staffId } = req.body;

        if (!staffId) {
            return res.status(400).json({
                message: 'Staff ID is required.'
            });
        }

        const staff = await User.findOne({
            _id: staffId,
            role: 'staff'
        });

        if (!staff) {
            return res.status(400).json({
                message: 'Invalid staff member selected.'
            });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            {
                assignedTeacher: staffId,
                assignedTo: staffId,
                department: staff.department,
                status: 'in-progress',
                updatedAt: Date.now()
            },
            { new: true }
        )
            .populate('student', 'name email department')
            .populate('assignedTeacher', 'name email department');

        if (!complaint) {
            return res.status(404).json({
                message: 'Complaint not found.'
            });
        }

        try {

            await sendResolutionEmail(
                staff.email,
                'New Complaint Assigned to You',
                `Hello ${staff.name || staff.email},

A new complaint titled "${complaint.title}" has been assigned to you.

Please login to the system and update the complaint progress.

Thank you.`
            );

            console.log(
                `Assignment email sent to ${staff.email}`
            );

        } catch (mailError) {
            console.error(
                'Assignment email error:',
                mailError
            );
        }

        console.log(
            `Complaint ${complaint._id} assigned to ${staff.name}`
        );

        res.json({
            message: 'Complaint assigned successfully',
            complaint
        });

    } catch (error) {
        console.error('Error in assignComplaint:', error);

        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// ===============================
// ADMIN - UPDATE STATUS
// ===============================
const updateComplaintStatus = async (req, res) => {
    try {

        const { status, resolutionNotes } = req.body;

        const complaint = await Complaint.findById(req.params.id)
            .populate('student', 'name email');

        if (!complaint) {
            return res.status(404).json({
                message: 'Complaint not found'
            });
        }

        complaint.status = status;
        complaint.resolutionNotes = resolutionNotes;
        complaint.updatedAt = Date.now();

        await complaint.save();

        if (
            status === 'resolved' &&
            complaint.student &&
            complaint.student.email
        ) {

            try {

                await sendResolutionEmail(
                    complaint.student.email,
                    'Complaint Resolved',
                    `Hello ${complaint.student.name},

Your complaint titled "${complaint.title}" has been resolved.

Resolution Notes:
${resolutionNotes || 'Issue resolved successfully.'}

Thank you.`
                );

                console.log(
                    `Resolution email sent to ${complaint.student.email}`
                );

            } catch (mailError) {
                console.error(
                    'Resolution email error:',
                    mailError
                );
            }
        }

        res.json({
            message: 'Complaint status updated successfully',
            complaint
        });

    } catch (error) {
        console.error(
            '[updateComplaintStatus] error:',
            error
        );

        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// ===============================
// STAFF - GET ASSIGNED COMPLAINTS
// ===============================
const getAssignedComplaints = async (req, res) => {
    try {

        const staffId = req.user.id;

        const staff = await User.findById(staffId).select(
            'department role name email'
        );

        if (!staff || staff.role !== 'staff') {
            return res.status(403).json({
                message:
                    'Only staff can access assigned complaints.'
            });
        }

        const complaints = await Complaint.find({
            $or: [
                { assignedTeacher: staffId },
                { assignedTo: staffId },
                { department: staff.department }
            ]
        })
            .populate('student', 'name email department')
            .populate('assignedTeacher', 'name email department')
            .sort({ date: -1 });

        console.log(
            '[getAssignedComplaints] staff:',
            staff.email,
            'count:',
            complaints.length
        );

        res.json(complaints);

    } catch (error) {
        console.error(
            '[getAssignedComplaints] error:',
            error
        );

        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// ===============================
// STAFF - UPDATE COMPLAINT
// ===============================
const staffUpdateComplaint = async (req, res) => {
    try {

        const { remarks } = req.body;

        const photoUrl = req.file
            ? `/uploads/${req.file.filename}`
            : '';

        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                message: 'Complaint not found'
            });
        }

        complaint.staffUpdates.push({
            remarks,
            photoUrl,
            updatedAt: new Date(),
            updatedBy: req.user.id
        });

        // Automatically set to in-progress
        if (complaint.status === 'pending') {
            complaint.status = 'in-progress';
        }

        complaint.updatedAt = new Date();

        await complaint.save();

        console.log(
            '[staffUpdateComplaint] updated:',
            complaint._id
        );

        res.json({
            message: 'Staff update submitted successfully',
            complaint
        });

    } catch (error) {
        console.error(
            '[staffUpdateComplaint] error:',
            error
        );

        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// ===============================
// PUBLIC STATS
// ===============================
const getComplaintStats = async (req, res) => {
    try {

        const totalComplaints =
            await Complaint.countDocuments();

        const resolvedComplaints =
            await Complaint.countDocuments({
                status: 'resolved'
            });

        const pendingComplaints =
            await Complaint.countDocuments({
                status: 'pending'
            });

        const inProgressComplaints =
            await Complaint.countDocuments({
                status: 'in-progress'
            });

        const resolvedComplaintsWithUpdates =
            await Complaint.find({
                status: 'resolved',
                'staffUpdates.0': { $exists: true }
            });

        let totalResponseTime = 0;
        let countWithResponseTime = 0;

        resolvedComplaintsWithUpdates.forEach(
            complaint => {

                if (
                    complaint.staffUpdates &&
                    complaint.staffUpdates.length > 0
                ) {

                    const firstUpdate =
                        complaint.staffUpdates[0];

                    const responseTime =
                        firstUpdate.updatedAt -
                        complaint.date;

                    totalResponseTime += responseTime;
                    countWithResponseTime++;
                }
            }
        );

        const avgResponseTime =
            countWithResponseTime > 0
                ? Math.round(
                    totalResponseTime /
                    countWithResponseTime /
                    (1000 * 60 * 60)
                )
                : 24;

        const stats = {
            total: totalComplaints,
            pending: pendingComplaints,
            inProgress: inProgressComplaints,
            resolved: resolvedComplaints,
            avgResponseTime
        };

        console.log(
            '[getComplaintStats] returning:',
            stats
        );

        res.json(stats);

    } catch (error) {
        console.error(
            '[getComplaintStats] error:',
            error
        );

        res.status(500).json({
            message: 'Server error'
        });
    }
};

module.exports = {
    createComplaint,
    getMyComplaints,
    getComplaintById,
    getAllComplaints,
    assignComplaint,
    updateComplaintStatus,
    getAssignedComplaints,
    staffUpdateComplaint,
    getComplaintStats
};