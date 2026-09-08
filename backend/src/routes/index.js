const express = require('express');
const authRoutes = require('./authRoutes');
const patientRoutes = require('./patientRoutes');
const adminRoutes = require('./adminRoutes');
const doctorRoutes = require('./doctorRoutes');
const { authenticate } = require('../middleware/auth');
const { exportPatientRecord } = require('../controllers/patientController');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);

// Registered ahead of the authenticated /patients router on purpose — see
// A10 note in patientController.exportPatientRecord for why this route
// deliberately does NOT go through the shared `authenticate` middleware.
router.get('/patients/:id/export', exportPatientRecord);

router.use('/patients', patientRoutes);
router.use('/admin', adminRoutes);
router.use('/doctors', doctorRoutes);

// Temporary endpoint to confirm role-based auth is wired correctly end to end.
// Will be replaced by real dashboard endpoints in the next phase.
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
