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

const updateAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;

        const eventAttendanceResult = await EventModel.aggregate([
            { $project: { eventId: 1, memberAttendance: 1 } },
            { $unwind: '$memberAttendance' },
            { $match: { 'memberAttendance.attendanceId': id } },
            {
                $lookup: {
                    from: 'members',
                    localField: 'memberAttendance.member',
                    foreignField: '_id',
                    as: 'memberInfo'
                }
            },
            { $unwind: '$memberInfo' },
        ]);

        console.log(JSON.stringify(eventAttendanceResult, null, 4));

        if (eventAttendanceResult.length !== 1) {
            res.sendStatus(404);
            return;
        }

        const { memberId, eventId, timeIn, timeOut } = req.body;

        const eventAttendance = eventAttendanceResult[0];

        const oldEventId = eventAttendance._id;
        let newEventId = eventAttendance._id;
        let newMemberId = eventAttendance.memberInfo._id;

        //if change member
        if (eventAttendance.memberInfo.memberId !== memberId) {
            const newMember = await MemberModel.findOne({ memberId: memberId });

            if (!newMember) {
                res.sendStatus(404);
                return;
            }

            newMemberId = newMember._id;
        }

        //if change event
        if (eventAttendance.eventId !== eventId) {
            const newEvent = await EventModel.findOne({ eventId: eventId });

            if (!newEvent) {
                res.sendStatus(404);
                return;
            }

            newEventId = newEvent._id;

            // remove from old event
            await EventModel.findByIdAndUpdate(oldEventId,
                { $pull: { memberAttendance: { attendanceId: id } } }
            );

            // assign to new event
            await EventModel.findByIdAndUpdate(newEventId,
                {
                    $push: {
                        memberAttendance: {
                            timeIn: timeIn,
                            timeOut: timeOut || null,
                            member: newMemberId,
                            attendanceId: id
                        }
                    }
                }
            );
        }
        else {
            await EventModel.findOneAndUpdate(
                { '_id': eventAttendance._id, 'memberAttendance._id': eventAttendance.memberAttendance._id },
                {
                    $set: {
                        'memberAttendance.$.member': newMemberId,
                        'memberAttendance.$.timeIn': timeIn,
                        'memberAttendance.$.timeOut': timeOut || null,
                        'memberAttendance.$.attendanceId': id
                    }
                }
            )
        }

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
    updateAttendance,
    deleteAttendance,
    attendanceValidation
}