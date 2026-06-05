const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            console.error('[authMiddleware] JWT_SECRET is missing in environment');
            return res.status(500).json({ message: 'Server auth configuration error.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[authMiddleware] authenticated user:', decoded.email, decoded.role);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('[authMiddleware] invalid token:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

module.exports = authMiddleware;