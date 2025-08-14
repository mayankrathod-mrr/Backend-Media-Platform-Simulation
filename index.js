// Load environment variables
require('dotenv').config();

// 1. Imports
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const rateLimit = require('express-rate-limit');

// 2. App Initialization
const app = express();
app.use(express.json());

// 3. Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Redis Client Setup
const redisClient = createClient({
    url: process.env.REDIS_URL
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();


// In-memory DB
const db = {
    adminUsers: [],
    mediaAssets: [],
    mediaViewLogs: []
};
let mediaIdCounter = 1;

// --- Middleware ---

// Rate Limiter for the view endpoint
const viewLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per window
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Too many view requests from this IP, please try again after 15 minutes'
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- API Endpoints ---

// POST /auth/signup
app.post('/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
        if (db.adminUsers.find(user => user.email === email)) return res.status(409).json({ message: 'User with this email already exists.' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: db.adminUsers.length + 1, email, hashedPassword, createdAt: new Date().toISOString() };
        db.adminUsers.push(newUser);
        
        res.status(201).json({ message: 'User created successfully.', userId: newUser.id });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.adminUsers.find(u => u.email === email);
        if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful.', token });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// POST /media (Authenticated)
app.post('/media', authenticateToken, (req, res) => {
    const { title, type, file_url } = req.body;
    if (!title || !type || !file_url) return res.status(400).json({ message: 'Title, type, and file_url are required.' });
    
    const newMediaAsset = { id: mediaIdCounter++, title, type, file_url, createdAt: new Date().toISOString() };
    db.mediaAssets.push(newMediaAsset);
    res.status(201).json({ message: 'Media added successfully.', media: newMediaAsset });
});

// POST /media/:id/view (Rate Limited & Authenticated)
app.post('/media/:id/view', authenticateToken, viewLimiter, (req, res) => {
    const mediaId = parseInt(req.params.id, 10);
    if (!db.mediaAssets.find(m => m.id === mediaId)) return res.status(404).json({ message: 'Media not found.' });
    
    const viewLog = { media_id: mediaId, viewed_by_ip: req.ip, timestamp: new Date().toISOString() };
    db.mediaViewLogs.push(viewLog);

    // When a new view is logged, invalidate the cache for that media's analytics
    const cacheKey = `analytics:${mediaId}`;
    redisClient.del(cacheKey);
    
    res.status(200).json({ message: 'View logged successfully.' });
});

// GET /media/:id/analytics (Cached & Authenticated)
app.get('/media/:id/analytics', authenticateToken, async (req, res) => {
    const mediaId = parseInt(req.params.id, 10);
    const cacheKey = `analytics:${mediaId}`;

    try {
        // 1. Check Redis Cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log(`Serving analytics for media ID ${mediaId} from cache.`);
            return res.status(200).json(JSON.parse(cachedData));
        }

        // 2. If not in cache, calculate it
        console.log(`Calculating analytics for media ID ${mediaId}.`);
        if (!db.mediaAssets.find(m => m.id === mediaId)) return res.status(404).json({ message: 'Media not found.' });
        
        const relevantLogs = db.mediaViewLogs.filter(log => log.media_id === mediaId);
        const total_views = relevantLogs.length;
        const unique_ips = new Set(relevantLogs.map(log => log.viewed_by_ip)).size;
        const views_per_day = relevantLogs.reduce((acc, log) => {
            const day = log.timestamp.split('T')[0];
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});
        
        const analyticsData = { total_views, unique_ips, views_per_day };

        // 3. Store the result in Redis with an expiration time (e.g., 1 hour)
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(analyticsData));

        res.status(200).json(analyticsData);
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});