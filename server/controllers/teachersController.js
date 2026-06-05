const User = require('../models/User');

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
        console.error('[teachersController] getActiveTeachers failed:', error.message);
        res.status(500).json({ message: 'Unable to fetch active teachers' });
    }
};

module.exports = { getActiveTeachers };