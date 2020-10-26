const { body, param } = require('express-validator');
const { InternalError, ValidationError } = require('../errorHandlers');

const MemberModel = require('../models/members/members.model');
const EventModel = require('../models/events/events.model');

//#region Member Methods

const getMembers = async (req, res, next) => {

    try {
        const members = await MemberModel.find()
            .select('-_id -__v')

        res.json(members);
    }
    catch (err) {
        next(new InternalError(err));
    }
}

const getMember = async (req, res, next) => {
    try {
        const member = await MemberModel.findOne({ memberId: req.params.id })
            .select('-__v')
            .lean();

        if (!member)
            res.sendStatus(404)
        else {
            const eventAttendance = await EventModel.aggregate([
                { $match: { 'memberAttendance.member': member._id } },
                { $unwind: '$memberAttendance' },
                { $match: { 'memberAttendance.member': member._id } },
                {
                    $project: {
                        _id: 0,
                        eventName: '$eventName',
                        timeIn: '$memberAttendance.timeIn',
                        timeOut: '$memberAttendance.timeOut',
                        attendanceId: '$memberAttendance.attendanceId'
                    }
                }
            ]);

            const { _id, ...memberLean } = member;

            res.json({ ...memberLean, eventAttendance });
        }
    }
    catch (err) {
        next(new InternalError(err));
    }
}

const searchMember = async (req, res, next) => {
    try {
        if (!req.query.name || !req.query.status) {
            res.sendStatus(400);
        }
        else {
            const { name, status } = req.query;

            const member = await MemberModel.find({ name: name, status: status })
                .select('-_id -__v');

            res.json(member);
        }
    }
    catch (err) {
        next(new InternalError(err));
    }
}

const createMember = async (req, res, next) => {
    try {
        const { name, status, joinedDate } = req.body;

        const newMember = new MemberModel({
            name: name,
            status: status,
            joinedDate: joinedDate || null
        });

        await newMember.save();

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

const updateMember = async (req, res, next) => {
    try {
        const member = await MemberModel.findOne({ memberId: req.params.id });

        if (!member) {
            res.sendStatus(404);
        }
        else {
            const { name, status, joinedDate } = req.body

            if (name) member.name = name;
            if (status) member.status = status;
            if (joinedDate) member.joinedDate = joinedDate;

            await member.save();

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

const deleteMember = async (req, res, next) => {
    try {
        const member = await MemberModel.findOne({ memberId: req.params.id });

        if (member) {
            member.remove();
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

//#endregion Member Methods

//#region Private Methods

const existsByName = async (name, memberId) => {
    if (memberId) {
        return await MemberModel.exists({ name: name, memberId: { $ne: memberId } });
    }

    return await MemberModel.exists({ name: name });
}

const hasEvent = async (memberId) => {
    const member = await MemberModel.findOne({ memberId: memberId });

    if (!member)
        return false;

    const memberEvents = await EventModel.aggregate([
        { $match: { 'memberAttendance.member': member._id } }
    ]);

    return memberEvents.length > 0;
}

//#endregion Private Methods

//#region Validation

const memberValidation = [
    body('name', 'name is required').trim().not().isEmpty(),
    body('status', 'status is required').trim().not().isEmpty(),
    body('status', 'invalid status (Active or In-active only)').trim().isIn(['Active', 'In-active']),
    body('joinedDate', 'joinedDate needs to be a valid date')
        .if(body('joinedDate').exists())
        .isISO8601().toDate()
]

const createValidation = [
    ...memberValidation,
    body('name')
        .if((_, { req }) => req.method === 'POST')
        .custom(async (value) => {
            const exists = await existsByName(value);
            if (exists)
                return Promise.reject('name already in use');
        }),
]

const updateValidation = [
    ...memberValidation,
    body('name')
        .if((_, { req }) => req.method === 'PUT')
        .custom(async (value, { req }) => {
            const exists = await existsByName(value, req.params.id);
            if (exists)
                return Promise.reject('name already in use');
        })
]

const deleteValidation = [
    param('id')
        .if((_, { req }) => req.method === 'DELETE')
        .if(param('id').isUUID(4))
        .custom(async (value) => {
            const hasAttendance = await hasEvent(value);
            if (hasAttendance)
                return Promise.reject('Event attendance exists. Cannot be deleted.');
        })
]

//#endregion Validation

module.exports = {
    getMember,
    getMembers,
    searchMember,
    createMember,
    updateMember,
    deleteMember,
    createValidation,
    updateValidation,
    deleteValidation
};