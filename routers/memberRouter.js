const express = require('express');
const memberController = require('../controllers/membersController');
const { requestValidationHandler } = require('../errorHandlers');

const router = express.Router();

router.get('/',
    memberController.getMembers);

router.get('/search',
    memberController.searchMember);

router.get('/:id',
    memberController.getMember);

router.post('/',
    memberController.createValidation,
    requestValidationHandler,
    memberController.createMember);

router.put('/:id',
    memberController.updateValidation,
    requestValidationHandler,
    memberController.updateMember);

router.delete('/:id',
    memberController.deleteValidation,
    requestValidationHandler,
    memberController.deleteMember);

module.exports = router;