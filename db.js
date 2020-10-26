const mongoose = require('mongoose');

const connect = async () => {
    const conn = await mongoose.connect(process.env.MONGODB_URI,
        {
            useUnifiedTopology: true,
            useNewUrlParser: true,
            useFindAndModify: false
        }
    );

    console.log(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connect;