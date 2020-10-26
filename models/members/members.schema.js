const mongoose = require('mongoose');
const { v4 } = require('uuid');

const memberSchema = mongoose.Schema({
    memberId: {
        type: String,
        required: true,
        default: v4
    },
    name: {
        type: String,
        required: true
    },
    joinedDate: {
        type: Date,
        required: false
    },
    status: {
        type: String,
        required: true
    }
}, { collection: 'members' });

module.exports = memberSchema;