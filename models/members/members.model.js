const mongoose = require('mongoose');
const memberSchema = require('./members.schema');
const MemberModel = mongoose.model('MemberModel', memberSchema);

module.exports = MemberModel;