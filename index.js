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

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
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


// GET /media/:id/stream-url
app.get('/media/:id/stream-url', (req, res) => {
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

        const viewLog = {
            media_id: mediaAsset.id,
            viewed_by_ip: req.ip,
            timestamp: new Date().toISOString()
        };
        db.mediaViewLogs.push(viewLog);
        console.log(`Stream URL generated for media ID ${mediaAsset.id}. View logged for IP: ${req.ip}`);

        res.status(200).json({ secure_url: secureStreamUrl });

    } catch (error) {
        console.error('Stream URL Generation Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// GET /stream/:id (Validates temporary token)
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


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('---');
    console.log('Available Endpoints:');
    console.log('  [POST] /auth/signup');
    console.log('  [POST] /auth/login');
    console.log('  [POST] /media');
    console.log('  [GET]  /media/:id/stream-url');
    console.log('---');
});
