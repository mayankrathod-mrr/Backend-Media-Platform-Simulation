// 1. Imports
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 2. App Initialization
const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies

// 3. Configuration
const PORT = 3000;
const JWT_SECRET = 'your-super-secret-and-strong-jwt-secret-key';

// In-memory DB
const db = {
    adminUsers: [],
    mediaAssets: [],
    mediaViewLogs: []
};
let mediaIdCounter = 1;

// --- API Endpoints ---

// POST /auth/signup
app.post('/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const existingUser = db.adminUsers.find(user => user.email === email);
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: db.adminUsers.length + 1,
            email: email,
            hashedPassword: hashedPassword,
            createdAt: new Date().toISOString()
        };

        db.adminUsers.push(newUser);
        console.log('New user signed up:', { id: newUser.id, email: newUser.email });
        res.status(201).json({ message: 'User created successfully.', userId: newUser.id });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: 'Internal server error during signup.' });
    }
});


// POST /auth/login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = db.adminUsers.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('User logged in:', { id: user.id, email: user.email });
        res.status(200).json({ message: 'Login successful.', token: token });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
});


// Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Unauthorized if no token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden if token is invalid
        req.user = user;
        next();
    });
};


// POST /media (Authenticated)
app.post('/media', authenticateToken, (req, res) => {
    try {
        const { title, type, file_url } = req.body;

        if (!title || !type || !file_url) {
            return res.status(400).json({ message: 'Title, type, and file_url are required.' });
        }
        if (!['video', 'audio'].includes(type)) {
            return res.status(400).json({ message: 'Type must be either "video" or "audio".' });
        }

        const newMediaAsset = {
            id: mediaIdCounter++,
            title: title,
            type: type,
            file_url: file_url,
            createdAt: new Date().toISOString()
        };

        db.mediaAssets.push(newMediaAsset);
        console.log('New media added:', newMediaAsset);
        res.status(201).json({ message: 'Media added successfully.', media: newMediaAsset });

    } catch (error) {
        console.error('Add Media Error:', error);
        res.status(500).json({ message: 'Internal server error while adding media.' });
    }
});


// GET /media/:id/stream-url (Authenticated)
app.get('/media/:id/stream-url', authenticateToken, (req, res) => {
    try {
        const mediaId = parseInt(req.params.id, 10);
        const mediaAsset = db.mediaAssets.find(m => m.id === mediaId);

        if (!mediaAsset) {
            return res.status(404).json({ message: 'Media not found.' });
        }

        const streamToken = jwt.sign(
            { mediaId: mediaAsset.id, access: 'stream' },
            JWT_SECRET,
            { expiresIn: '10m' } // Expires in 10 minutes
        );
        
        const secureStreamUrl = `http://localhost:${PORT}/stream/${mediaAsset.id}?token=${streamToken}`;

        res.status(200).json({ secure_url: secureStreamUrl });

    } catch (error) {
        console.error('Stream URL Generation Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// GET /stream/:id (Validates temporary token, Public)
app.get('/stream/:id', (req, res) => {
    const { token } = req.query;
    const mediaId = parseInt(req.params.id, 10);

    if (!token) return res.status(401).send('Access denied. No token provided.');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.mediaId !== mediaId || decoded.access !== 'stream') {
            throw new Error('Invalid token payload.');
        }

        const mediaAsset = db.mediaAssets.find(m => m.id === mediaId);
        if (!mediaAsset) return res.status(404).send('Media not found.');
        
        console.log(`Streaming access granted for media ID ${mediaId}.`);
        res.status(200).json({
            message: `Success! You have temporary access to stream the media.`,
            original_file_url: mediaAsset.file_url
        });

    } catch (error) {
        res.status(403).send('Access denied. Invalid or expired token.');
    }
});

// --- NEW ANALYTICS ENDPOINTS ---

// POST /media/:id/view (Authenticated)
app.post('/media/:id/view', authenticateToken, (req, res) => {
    const mediaId = parseInt(req.params.id, 10);
    const mediaAsset = db.mediaAssets.find(m => m.id === mediaId);

    // Handle edge case: media not found
    if (!mediaAsset) {
        return res.status(404).json({ message: 'Media not found.' });
    }

    // Log the view
    const viewLog = {
        media_id: mediaId,
        viewed_by_ip: req.ip,
        timestamp: new Date().toISOString()
    };
    db.mediaViewLogs.push(viewLog);
    
    console.log(`View logged for media ID ${mediaId} from IP: ${req.ip}`);
    res.status(200).json({ message: 'View logged successfully.' });
});

// GET /media/:id/analytics (Authenticated)
app.get('/media/:id/analytics', authenticateToken, (req, res) => {
    const mediaId = parseInt(req.params.id, 10);
    const mediaAsset = db.mediaAssets.find(m => m.id === mediaId);

    // Handle edge case: media not found
    if (!mediaAsset) {
        return res.status(404).json({ message: 'Media not found.' });
    }

    // Filter logs for the specific media ID
    const relevantLogs = db.mediaViewLogs.filter(log => log.media_id === mediaId);

    // Calculate total views
    const total_views = relevantLogs.length;

    // Calculate unique IPs
    const unique_ips = new Set(relevantLogs.map(log => log.viewed_by_ip)).size;

    // Calculate views per day
    const views_per_day = relevantLogs.reduce((acc, log) => {
        const day = log.timestamp.split('T')[0]; // Gets 'YYYY-MM-DD'
        acc[day] = (acc[day] || 0) + 1;
        return acc;
    }, {});

    res.status(200).json({
        total_views: total_views,
        unique_ips: unique_ips,
        views_per_day: views_per_day
    });
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('---');
    console.log('Available Endpoints:');
    console.log('  [POST] /auth/signup');
    console.log('  [POST] /auth/login');
    console.log('  [POST] /media (Authenticated)');
    console.log('  [GET]  /media/:id/stream-url (Authenticated)');
    console.log('  [POST] /media/:id/view (Authenticated)');
    console.log('  [GET]  /media/:id/analytics (Authenticated)');
    console.log('---');
});
