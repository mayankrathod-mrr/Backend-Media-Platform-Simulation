Backend Media Platform Simulation
This project is a backend simulation for a media platform, built with Node.js and Express.js. It fulfills a skills assessment task that required setting up a complete backend service including user authentication, protected routes, and secure, temporary media streaming links.

Features Implemented
User Authentication: Secure user signup and login using JWT (JSON Web Tokens). Passwords are encrypted using bcrypt.

Protected Routes: Media creation endpoint is protected and requires a valid JWT token for access.

Database Schema Design: Implemented the required database models for Admin Users, Media Assets, and Media View Logs using in-memory storage.

Secure Temporary Links: A dedicated endpoint generates a secure URL for media streaming that automatically expires after 10 minutes.

View Tracking: Logs the IP address and timestamp whenever a secure streaming link is generated.

Technologies Used
Node.js: JavaScript runtime environment.

Express.js: Web framework for building the API.

JSON Web Token (JWT): For creating secure authentication tokens.

bcrypt: For hashing user passwords.

Setup and Installation
Clone the repository: git clone <your-repo-url>

Navigate to the project directory: cd TASK-1

Install dependencies: npm install

Start the server: node index.js

The server will be running at http://localhost:3000.

API Endpoints Guide
You can test the following endpoints using a tool like Postman.

1. POST /auth/signup
Creates a new admin user.

Request Body:

JSON

{
    "email": "myemail@test.com",
    "password": "password123"
}
Success Response:

JSON

{
    "message": "User created successfully.",
    "userId": 1
}
2. POST /auth/login
Logs in a user and returns a JWT token.

Request Body:

JSON

{
    "email": "myemail@test.com",
    "password": "password123"
}
Success Response:

JSON

{
    "message": "Login successful.",
    "token": "ey... (a long token string)"
}
3. POST /media (Authenticated)
Adds new media metadata. Requires a Bearer Token.

Headers:
Authorization: Bearer <your-jwt-token>

Request Body:

JSON

{
    "title": "My Test Video",
    "type": "video",
    "file_url": "https://example.com/video.mp4"
}
Success Response:

JSON

{
    "message": "Media added successfully.",
    "media": {
        "id": 1,
        "title": "My Test Video",
        "type": "video",
        "file_url": "https://example.com/video.mp4",
        "createdAt": "..."
    }
}
4. GET /media/:id/stream-url
Returns a secure, 10-minute streaming link for a media asset.

Example URL: http://localhost:3000/media/1/stream-url

Success Response:

JSON

{
    "secure_url": "http://localhost:3000/stream/1?token=ey..."
}
Step 2: Upload to GitHub
Create a new, public repository on your GitHub account.

Upload your project files to this new repository:

index.js

package.json

README.md (the file you just created)

Step 3: Share on LinkedIn
Now you can show it off!

Go to your LinkedIn profile and create a new post.

Write something professional and exciting. Here’s a template you can use:

I'm excited to share a backend project I recently completed! It's a simulation of a media platform's backend built with Node.js and Express.

I successfully implemented:
✅ Secure user authentication with JWT and password hashing.
✅ Protected API routes for authenticated users.
✅ A system to generate secure, temporary (10-min) streaming links.

This was a great exercise in building a secure and practical API from scratch. You can check out the full project and documentation on my GitHub!

#NodeJS #ExpressJS #Backend #API #Developer #JavaScript #JWT #Programming


