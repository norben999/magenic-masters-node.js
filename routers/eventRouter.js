const express = require('express');
const eventsController = require('../controllers/eventsController');
const { requestValidationHandler } = require('../errorHandlers');

const router = express.Router();

router.get('/',
    eventsController.getEvents);

router.get('/export',
    eventsController.exportEvent);

router.get('/search',
    eventsController.searchValidation,
    requestValidationHandler,
    eventsController.searchEvent
)

router.get('/:id',
    eventsController.getEvent);

router.post('/',
    eventsController.createValidation,
    requestValidationHandler,
    eventsController.createEvent);

router.put('/:id',
    eventsController.updateValidation,
    requestValidationHandler,
    eventsController.updateEvent);

router.delete('/:id',
    eventsController.deleteValidation,
    requestValidationHandler,
    eventsController.deleteEvent);

module.exports = router;