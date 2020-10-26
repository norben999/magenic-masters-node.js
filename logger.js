const moment = require('moment');
const EventEmitter = require('events');
const fs = require('fs');

const eventEmitter = new EventEmitter();

const dir = './logs';

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

const logMessage = (message) => {   

    const fileName = `logs/AttendanceMonitoringLogs-${moment().format('YYYY-MM-DD')}.txt`;

    fs.appendFile(fileName, message, (err) => {
        if (err) throw err;
        console.log('Log added')
    });
}

eventEmitter.on('logMessage', logMessage);

const log = async (req, res, next) => {
    const message = `${moment()}: ${req.method} ${req.url}\n${Object.keys(req.body).length === 0 ? '' : JSON.stringify(req.body) + '\n'}\n`;

    eventEmitter.emit('logMessage', message);

    next();
}

module.exports = {
    log
}
