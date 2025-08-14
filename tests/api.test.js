// API tests for the media platform
const request = require('supertest');
const API_URL = 'http://localhost:3000';

describe('Media Platform API', () => {
    let token;

    beforeAll(async () => {
        // Sign up and log in to get a token
        try {
            await request(API_URL)
                .post('/auth/signup')
                .send({
                    email: 'testuser@example.com',
                    password: 'password123'
                });
        } catch (e) {
            // Ignore error if user already exists from a previous run
        }

        const res = await request(API_URL)
            .post('/auth/login')
            .send({
                email: 'testuser@example.com',
                password: 'password123'
            });
        token = res.body.token;
    });

    it('should create a new media asset', async () => {
        const res = await request(API_URL)
            .post('/media')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Test Video from Jest',
                type: 'video',
                file_url: 'http://example.com/test.mp4'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('media');
    });

    it('should log a view for a media asset', async () => {
        const res = await request(API_URL)
            .post('/media/1/view')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
    });

    it('should get analytics for a media asset', async () => {
        const res = await request(API_URL)
            .get('/media/1/analytics')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('total_views');
    });

    it('should fail to access protected route without a token', async () => {
        const res = await request(API_URL).post('/media/1/view');
        expect(res.statusCode).toEqual(401);
    });
});
