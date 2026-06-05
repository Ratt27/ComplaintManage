const express = require('express');
const router = express.Router();
const { getActiveTeachers } = require('../controllers/teachersController');

router.get('/active', getActiveTeachers);

module.exports = router;

