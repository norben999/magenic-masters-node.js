const moment = require('moment');
const { body, query, param, oneOf } = require('express-validator');
const XLSX = require('xlsx');

const { InternalError, ValidationError } = require('../errorHandlers');
const EventModel = require('../models/events/events.model');


//#region Event Methods

const getEvents = async (req, res, next) => {
    try {
        const events = await EventModel.find()
            .select('-_id -__v -memberAttendance')

        res.json(events);
    }
    catch (err) {
        next(new InternalError(err));
    }
}

const getEvent = async (req, res, next) => {
    try {
        const event = await EventModel.findOne({ eventId: req.params.id })
            .select('-_id -__v -memberAttendance._id')
            .populate({
                path: 'memberAttendance.member',
                model: 'MemberModel',
                select: 'name memberId -_id'
            })
            .lean()
            .exec();

        event.memberAttendance = event.memberAttendance.map(({ member, ...rest }) => ({ ...rest, ...member }));

        if (!event)
            res.sendStatus(404);
        else
            res.json(event);
    }
    catch (err) {
        next(new InternalError(err));
    }
}

const searchEvent = async (req, res, next) => {
    try {
        const { eventName, startDateTime, endDateTime } = req.query;

        if (!eventName || !startDateTime || !endDateTime) {
            res.sendStatus(400);
        }
        else {
            const { name, status } = req.query;

            const event = await EventModel.find({ eventName: eventName, startDateTime: startDateTime, endDateTime: endDateTime })
                .select('-_id -__v -memberAttendance');

            res.json(event);
        }
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

const createEvent = async (req, res, next) => {
    try {
        const { eventName, eventType, startDateTime, endDateTime } = req.body;

        const newEvent = new EventModel({
            eventName: eventName,
            eventType: eventType,
            startDateTime: startDateTime,
            endDateTime: endDateTime
        });

        await newEvent.save();

        res.sendStatus(201);
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

const updateEvent = async (req, res, next) => {
    try {
        const event = await EventModel.findOne({ eventId: req.params.id });

        if (!event)
            res.sendStatus(404);
        else {

            const { eventName, eventType, startDateTime, endDateTime } = req.body

            if (eventName) event.eventName = eventName;
            if (eventType) event.eventType = eventType;
            if (startDateTime) event.startDateTime = startDateTime;
            if (endDateTime) event.endDateTime = endDateTime;

            await event.save();

            res.sendStatus(200);
        }
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

const deleteEvent = async (req, res, next) => {
    try {
        const event = await EventModel.findOne({ eventId: req.params.id });

        if (event) {
            await event.remove();
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

const exportEvent = async (req, res, next) => {
    try {
        const { eventId } = req.query;

        console.log(eventId);

        if (!eventId) {
            res.sendStatus(400);
            return;
        }

        const events = await EventModel.aggregate([
            { $match: { eventId: eventId } },
            { $unwind: '$memberAttendance' },
            { $sort: { 'memberAttendance.timeIn': 1 } },
            {
                $lookup: {
                    from: 'members',
                    localField: 'memberAttendance.member',
                    foreignField: '_id',
                    as: 'memberInfo'
                }
            },
            { $unwind: '$memberInfo' },
            {
                $project: {
                    eventName: '$eventName',
                    startDateTime: '$startDateTime',
                    memberName: '$memberInfo.name',
                    timeIn: '$memberAttendance.timeIn',
                    timeOut: '$memberAttendance.timeOut'
                }
            },
            {
                $group: {
                    _id: {
                        eventName: '$eventName',
                        startDateTime: '$startDateTime'
                    },
                    memberAttendance: {
                        $push: {
                            memberName: '$memberName',
                            timeIn: '$timeIn',
                            timeOut: '$timeOut'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    eventName: '$_id.eventName',
                    startDateTime: '$_id.startDateTime',
                    memberAttendance: '$memberAttendance'
                }
            }
        ]);

        if (events.length === 0) {
            res.sendStatus(404);
            return;
        }

        const event = events[0];

        const fileName = `${event.eventName}_${moment(event.startDateTime).format()}.xlsx`;

        const workBook = XLSX.utils.book_new();

        const header = [['Member Name', 'Time-In', 'Time-Out']];

        const workSheet = XLSX.utils.aoa_to_sheet(header);

        XLSX.utils.sheet_add_json(workSheet, event.memberAttendance, { origin: 'A2', skipHeader: true })
        XLSX.utils.book_append_sheet(workBook, workSheet, `${event.eventName}`)

        const writeOpts = { bookType: 'xlsx', bookSST: false, type: 'buffer' };
        const buffer = XLSX.write(workBook, writeOpts);

        res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.set('Content-Disposition', `attachment; filename=${fileName}`);
        res.status(200).send(buffer);
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

//#endregion Event Methods

//#region Private Methods

const existsByName = async (eventName, eventId) => {
    if (eventId) {
        return await EventModel.exists({ eventName: eventName, eventId: { $ne: eventId } });
    }

    return await EventModel.exists({ eventName: eventName });
}

const hasAttendance = async (eventId) => {
    const event = await EventModel.findOne({ eventId: eventId });

    if (!event)
        return false;

    return event.memberAttendance.length > 0;
}

//#endregion Private Methods


//#region Validation

const eventValidation = [
    body('eventName', 'eventName is required').trim().not().isEmpty(),
    body('eventType', 'eventType is required').trim().not().isEmpty(),
    body('startDateTime', 'startDateTime is required').trim().not().isEmpty(),
    body('endDateTime', 'endDateTime is required').trim().not().isEmpty(),
    body('startDateTime', 'startDateTime needs to be a valid date').isISO8601().toDate(),
    body('endDateTime', 'endDateTime needs to be a valid date')
        .isISO8601().toDate()
        .bail()
        .custom((value, { req }) => value >= req.body.startDateTime)
        .withMessage('startDateTime should be < endDateTime')
]

const createValidation = [
    ...eventValidation,
    body('eventName')
        .if((_, { req }) => req.method === 'POST')
        .custom(async (value) => {
            const exists = await existsByName(value);
            if (exists)
                return Promise.reject('Event Name already in use');
        }),
]

const updateValidation = [
    ...eventValidation,
    body('eventName')
        .if((_, { req }) => req.method === 'PUT')
        .custom(async (value, { req }) => {
            const exists = await existsByName(value, req.params.id);
            console.log(exists);
            if (exists)
                return Promise.reject('Event Name already in use');
        })
]

const searchValidation = [
    query('startDateTime', 'startDateTime needs to be a valid date')
        .if(query('startDateTime').exists())
        .isISO8601().toDate(),
    query('endDateTime', 'endDateTime needs to be a valid date')
        .if(query('endDateTime').exists())
        .isISO8601().toDate()
]

const deleteValidation = [
    param('id')
        .if((_, { req }) => req.method === 'DELETE')
        .if(param('id').isUUID(4))
        .custom(async (value) => {
            const hasMemberAttendance = await hasAttendance(value);
            if (hasMemberAttendance)
                return Promise.reject('Member attendance exists. Cannot be deleted.');
        })
]

//#endregion Validation

module.exports = {
    getEvent,
    getEvents,
    searchEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    exportEvent,
    createValidation,
    updateValidation,
    searchValidation,
    deleteValidation
};