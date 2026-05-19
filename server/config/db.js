const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not defined in the environment');
    }
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        // Caller will handle logging and server start
        return;
    } catch (error) {
        console.error('MongoDB connection error:', error.message || error);
        throw error;
    }
};

module.exports = connectDB;
