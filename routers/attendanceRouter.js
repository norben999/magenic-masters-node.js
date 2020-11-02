const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { requestValidationHandler } = require('../errorHandlers');

const router = express.Router();

router.post('/',
    attendanceController.attendanceValidation,
    requestValidationHandler,
    attendanceController.addAttendance);

router.put('/:id',
    attendanceController.attendanceValidation,
    requestValidationHandler,
    attendanceController.updateAttendance);

router.delete('/:id',
    attendanceController.deleteAttendance);

module.exports = router;