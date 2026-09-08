const express = require('express');
const { authenticate, authorize, requireDoctorProfile } = require('../middleware/auth');
const {
  searchPatients,
  getPatientById,
  addNote,
  updateNote,
  deleteNote,
  fetchLabResult,
  getMyRecord,
  updatePatientStatus,
  createPatient
} = require('../controllers/patientController');

const router = express.Router();

router.use(authenticate);

// Doctor/admin: search patients by name
router.get('/search', authorize('doctor', 'admin'), searchPatients);

// Patient: view own record (must come before /:id). Left in place for
// completeness, but unreachable in practice now — patients no longer get
// portal accounts, so no user will ever hold role "patient" here.
router.get('/me', authorize('patient'), getMyRecord);

// Doctor/admin/patient: view a patient record.
// NOTE: intentionally not restricting a "patient" caller to their OWN id here — see A01 note in controller.
router.get('/:id', authorize('doctor', 'admin', 'patient'), getPatientById);

router.post('/create', authorize('admin'),createPatient);
// Doctor: add a medical note to a patient's record
router.post('/:id/notes', authorize('doctor', 'admin'), requireDoctorProfile, addNote);

// Doctor/admin: edit or delete a note. Ownership (a doctor can only touch
// their own notes) is enforced inside the controller, not here, since
// admins are allowed through regardless of authorship.
router.put('/:id/notes/:noteId', authorize('doctor', 'admin'), updateNote);
router.delete('/:id/notes/:noteId', authorize('doctor', 'admin'), deleteNote);

// Doctor/admin: trigger a fetch of lab results from an external URL
router.post('/:id/lab-results/fetch', authorize('doctor', 'admin'), fetchLabResult);

router.patch('/:id/status', authorize('admin','doctor'), updatePatientStatus);



module.exports = router;
