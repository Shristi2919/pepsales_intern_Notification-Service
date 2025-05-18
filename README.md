Notification Service
A robust notification service that allows sending and retrieving notifications for users through multiple channels.
Features

RESTful API Endpoints:

POST /notifications - Send a notification to a user
GET /users/{id}/notifications - Get all notifications for a specific user


Supported Notification Types:

Email
SMS
In-App notifications


Advanced Features:

Message Queue (RabbitMQ) for asynchronous processing
Automatic retry mechanism for failed notifications
Exponential backoff for retries



Tech Stack

Node.js with TypeScript
Express.js for REST API
MongoDB for data storage
RabbitMQ for message queuing
Docker for containerization

Architecture
The service implements a queue-based architecture to handle notifications:

API receives notification requests
Notifications are saved to MongoDB
Messages are published to RabbitMQ
Worker consumes messages and processes notifications
Failed notifications are automatically retried with exponential backoff

Getting Started
Prerequisites

Docker and Docker Compose installed
Node.js 18+ (for local development)

Setup and Run

Clone the repository
git clone https://github.com/yourusername/notification-service.git
cd notification-service

Start the services using Docker Compose
docker-compose up

The API will be available at http://localhost:3000

For Local Development

Install dependencies
npm install

Run MongoDB and RabbitMQ locally or use Docker Compose
docker-compose up mongo rabbitmq

Run the service
npm run dev


API Documentation
Send a Notification
Endpoint: POST /api/notifications
Request Body:
json{
  "userId": "60d21b4667d0d8992e610c85",
  "type": "email",
  "content": "Hello, this is a notification!",
  "subject": "New notification"
}
Response:
json{
  "_id": "60d21b4667d0d8992e610c86",
  "userId": "60d21b4667d0d8992e610c85",
  "type": "email",
  "content": "Hello, this is a notification!",
  "subject": "New notification",
  "status": "pending",
  "retryCount": 0,
  "createdAt": "2023-08-01T12:00:00.000Z",
  "updatedAt": "2023-08-01T12:00:00.000Z"
}
Get User Notifications
Endpoint: GET /api/users/{id}/notifications
Response:
json[
  {
    "_id": "60d21b4667d0d8992e610c86",
    "userId": "60d21b4667d0d8992e610c85",
    "type": "email",
    "content": "Hello, this is a notification!",
    "subject": "New notification",
    "status": "sent",
    "retryCount": 0,
    "createdAt": "2023-08-01T12:00:00.000Z",
    "updatedAt": "2023-08-01T12:00:00.000Z"
  },
  {
    "_id": "60d21b4667d0d8992e610c87",
    "userId": "60d21b4667d0d8992e610c85",
    "type": "sms",
    "content": "This is an SMS notification",
    "status": "sent",
    "retryCount": 0,
    "createdAt": "2023-08-01T11:00:00.000Z",
    "updatedAt": "2023-08-01T11:00:00.000Z"
  }
]
Testing
Run the test suite with:
npm test
The tests use an in-memory MongoDB server to avoid requiring an actual database connection.
Project Structure
notification-service/
├── src/
│   ├── controllers/       # Request handlers
│   ├── models/            # MongoDB schemas and models
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic
│   │   ├── notification.service.ts   # Core notification service
│   │   ├── notification.processor.ts # Queue consumer
│   │   ├── email.service.ts          # Email provider
│   │   ├── sms.service.ts            # SMS provider
│   │   └── in-app.service.ts         # In-app notification provider
│   ├── db/                # Database connection
│   └── index.ts           # Application entry point
├── tests/                 # Test files
├── docker-compose.yml     # Docker compose configuration
├── Dockerfile             # Docker build instructions
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
Assumptions and Design Decisions

User Management: The service assumes that user records exist in the database with proper contact information (email/phone). In a real-world scenario, this would integrate with a user service.
Transport Providers: Email, SMS, and in-app notification services are stubbed with mock implementations. In a production environment, these would be integrated with actual providers (SendGrid, Twilio, etc.).
Queue-Based Architecture: Using a message queue allows for:

Decoupling of notification request and processing
Improved system resilience
Horizontal scaling of producers and consumers independently


Retry Mechanism: Failed notifications are retried with exponential backoff (5s, 25s, 125s) to handle temporary outages of notification providers.
Database Schema: The notification schema includes fields for tracking status and retry attempts, which is essential for monitoring and debugging.

Potential Improvements

Add user preference management for notification types
Implement rate limiting to prevent notification flooding
Add batch notification capabilities
Support for rich content (HTML emails, attachments)
Implement webhooks for notification delivery status updates
Add metrics and monitoring for notification success/failure rates
Implement notification templates

License
MIT
