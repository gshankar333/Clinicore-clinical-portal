const express = require('express');
const { authenticate, authorize, requireDoctorProfile } = require('../middleware/auth');
const { getMyPatients } = require('../controllers/doctorController');

const router = express.Router();

router.use(authenticate, authorize('doctor'), requireDoctorProfile);

router.get('/me/patients', getMyPatients);

module.exports = router;
