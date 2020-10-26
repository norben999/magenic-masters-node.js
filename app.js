const express = require('express');
const dotenv = require('dotenv');
const connect = require('./db');
const logger = require('./logger');
const memberRouter = require('./routers/memberRouter');
const eventRouter = require('./routers/eventRouter');
const attendanceRouter = require('./routers/attendanceRouter');
const { validationErrorHandler, internalErrorHandler } = require('./errorHandlers');

dotenv.config({ path: './config/config.env' });

const app = express();
const port = process.env.port || 3000;

connect();

app.use(express.json());
app.use(logger.log);

app.use('/api/members', memberRouter);
app.use('/api/events', eventRouter);
app.use('/api/attendance', attendanceRouter);

app.use(validationErrorHandler);
app.use(internalErrorHandler);


app.listen(port, () => {
    console.log(`Server is running in ${process.env.NODE_ENV} mode on port: ${port}`);
});



