const mongoose = require('mongoose');
const eventSchema = require('./events.schema');
const EventModel = mongoose.model('EventModel', eventSchema);

module.exports = EventModel;