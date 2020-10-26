const { body } = require('express-validator');

const { InternalError, ValidationError } = require('../errorHandlers');
const EventModel = require('../models/events/events.model');
const MemberModel = require('../models/members/members.model');


//#region Attendance Methods

const addAttendance = async (req, res, next) => {
    try {
        const { memberId, eventId, timeIn, timeOut } = req.body;

        const member = await MemberModel.findOne({ memberId: memberId });

        if (!member) {
            res.sendStatus(404);
            return;
        }

        const event = await EventModel.findOne({ eventId: eventId });

        if (!event) {
            res.sendStatus(404);
            return;
        }

        await EventModel.findOneAndUpdate(
            { _id: event._id },
            {
                $push: {
                    memberAttendance: {
                        timeIn: timeIn,
                        timeOut: timeOut || null,
                        member: member._id
                    }
                }
            }
        );

        res.sendStatus(200);
    }
    catch (err) {
        if (err instanceof ValidationError) {
            next(err)
        }
        else {
            next(new InternalError(err));
        }
    }
}

const deleteAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;

        await EventModel.findOneAndUpdate(
            { 'memberAttendance.attendanceId': id },
            { $pull: { memberAttendance: { attendanceId: id } } }
        );

        res.sendStatus(200);
    }
    catch (err) {
        if (err instanceof ValidationError) {
            next(err)
        }
        else {
            next(new InternalError(err));
        }
    }
}

//#endregion Attendance Methods

//#region Validation

const attendanceValidation = [
    body('eventId', 'eventId is required').trim().not().isEmpty(),
    body('memberId', 'memberId is required').trim().not().isEmpty(),
    body('timeIn', 'timeIn is required').trim().not().isEmpty()
        .isISO8601().withMessage('timeOut needs to be a valid date')
        .toDate(),
    body('timeOut', 'timeOut needs to be a valid date')
        .if(body('timeOut').exists())
        .isISO8601().toDate()
        .bail()
        .custom((value, { req }) => value >= req.body.timeIn)
        .withMessage('timeIn should be < timeOut date')
]

//#endregion Validation

module.exports = {
    addAttendance,
    deleteAttendance,
    attendanceValidation
}