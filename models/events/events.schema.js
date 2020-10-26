const mongoose = require('mongoose');
const { v4 } = require('uuid');

const attendanceSchema = mongoose.Schema({
    attendanceId: {
        type: String,
        required: true,
        default: v4
    },
    timeIn: {
        type: Date,
        required: true
    },
    timeOut: {
        type: Date,
        required: false
    },
    member: {
        type: mongoose.Types.ObjectId,
        ref: 'MemberModel'
    }
});

const eventSchema = mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        default: v4
    },
    eventName: {
        type: String,
        required: true
    },
    eventType: {
        type: String,
        required: true
    },
    startDateTime: {
        type: Date,
        required: true
    },
    endDateTime: {
        type: Date,
        required: true
    },
    memberAttendance: [attendanceSchema]
}, { collection: 'events' });

module.exports = eventSchema;