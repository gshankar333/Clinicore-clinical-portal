const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listUsers,
  createUser,
  deleteUser,
  getAuditLogs,
  importRecords,
  listDoctors,
  createDoctor,
  getDoctorProfile,
  updateDoctor,
  deleteDoctor,
  getDoctorPatients,
  assignPatientToDoctor,
} = require('../controllers/adminController');
const { createPatient, updatePatient, deletePatient, getPatientsByFilter } = require('../controllers/patientController');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/users', listUsers);
router.post('/users', createUser);
router.delete('/users/:id', deleteUser);
router.get('/audit-logs', getAuditLogs);
router.post('/import', importRecords);

router.get('/doctors', listDoctors);
router.post('/doctors', createDoctor);
router.get('/doctors/:id', getDoctorProfile);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);
router.get('/doctors/:id/patients', getDoctorPatients);
router.post('/doctors/:id/assign-patient', assignPatientToDoctor);

// Admin has full CRUD on patients (create/update/delete), beyond what a
// doctor can do (view + manage notes/labs on their own assigned patients).
router.get('/patients', getPatientsByFilter);
router.post('/patients', createPatient);
router.put('/patients/:id', updatePatient);
router.delete('/patients/:id', deletePatient);

module.exports = router;
