# Backend Media Platform Simulation (v2)

This project is a backend simulation for a media platform, built with Node.js and Express.js. It includes user authentication, protected routes, secure streaming links, analytics, caching with Redis, rate limiting, and is containerized with Docker.

## Features Implemented

- **User Authentication:** Secure signup/login with JWT and password hashing.
- **Protected Routes:** All media endpoints are protected.
- **Analytics:** Endpoint to get total views, unique viewers, and views per day.
- **Caching:** `GET /media/:id/analytics` is cached using **Redis** to improve performance.
- **Rate Limiting:** `POST /media/:id/view` is rate-limited to prevent abuse.
- **Containerization:** The application is containerized using **Docker**.
- **Automated Tests:** API tests are written using **Jest** and **Supertest**.
- **Environment-based Config:** Configuration is managed using a `.env` file.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/products/docker-desktop/)
- A running [Redis](https://redis.io/docs/getting-started/) instance.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <repo-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables:**
    Create a `.env` file in the root directory and copy the contents from `.env.example`.
    ```bash
    cp .env.example .env
    ```

4.  **Ensure Redis is running.** If using Docker, you can run Redis with:
    ```bash
    docker run -d -p 6379:6379 --name my-redis redis
    ```

5.  **Start the server:**
    ```bash
    npm start
    ```
    The server will be running at `http://localhost:3000`.

## Running with Docker

1.  **Build the Docker image:**
    ```bash
    docker build -t media-platform-api .
    ```

2.  **Run the Docker container:**
    (Ensure your Redis container is running first)
    ```bash
    docker run -p 3000:3000 --name media-api --env-file ./.env --network host media-platform-api
    ```
    *Note: `--network host` is used here for simplicity to connect to Redis running on localhost. In production, you would use Docker networking.*

## Running Tests

To run the automated tests, use the following command:
```bash
npm test