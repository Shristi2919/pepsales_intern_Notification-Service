import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Channel } from 'amqplib';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { notificationRoutes } from '../src/routes/notification.routes';
import { NotificationService } from '../src/services/notification.service';
import { User } from '../src/models/user.model';
import { NotificationType, NotificationStatus } from '../src/models/notification.model';

// Mock the amqplib Channel
const mockChannel: jest.Mocked<Channel> = {
  sendToQueue: jest.fn(),
  assertQueue: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn(),
} as any;

describe('Notification API', () => {
  let app: express.Express;
  let mongoServer: MongoMemoryServer;
  let testUserId: string;
  
  beforeAll(async () => {
    // Set up MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Create a test user
    const user = await User.create({
      email: 'test@example.com',
      phone: '+12345678901'
    });
    testUserId = user._id.toString();
    
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    
    const notificationService = new NotificationService(mockChannel);
    app.use('/api', notificationRoutes(notificationService));
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/notifications', () => {
    it('should create a notification', async () => {
      // Arrange
      const notificationData = {
        userId: testUserId,
        type: NotificationType.EMAIL,
        content: 'Test notification content',
        subject: 'Test Subject'
      };
      
      // Act
      const response = await request(app)
        .post('/api/notifications')
        .send(notificationData);
      
      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.type).toBe(NotificationType.EMAIL);
      expect(response.body.content).toBe('Test notification content');
      expect(response.body.subject).toBe('Test Subject');
      expect(response.body.status).toBe(NotificationStatus.PENDING);
      expect(response.body.retryCount).toBe(0);
      
      // Verify queue message was sent
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1);
      const queueArgs = mockChannel.sendToQueue.mock.calls[0];
      expect(queueArgs[0]).toBe('notifications');
      expect(JSON.parse(queueArgs[1].toString())).toHaveProperty('id', response.body._id);
    });
    
    it('should return 400 for missing required fields', async () => {
      // Arrange
      const incompleteData = {
        userId: testUserId,
        // missing type and content
      };
      
      // Act
      const response = await request(app)
        .post('/api/notifications')
        .send(incompleteData);
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });
    
    it('should return 400 for invalid user ID', async () => {
      // Arrange
      const dataWithInvalidUserId = {
        userId: 'invalid-user-id',
        type: NotificationType.EMAIL,
        content: 'Test content'
      };
      
      // Act
      const response = await request(app)
        .post('/api/notifications')
        .send(dataWithInvalidUserId);
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid userId format');
    });
    
    it('should return 400 for invalid notification type', async () => {
      // Arrange
      const dataWithInvalidType = {
        userId: testUserId,
        type: 'invalid-type',
        content: 'Test content'
      };
      
      // Act
      const response = await request(app)
        .post('/api/notifications')
        .send(dataWithInvalidType);
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid notification type');
    });
  });
  
  describe('GET /api/users/{id}/notifications', () => {
    beforeEach(async () => {
      // Create test notifications for the user
      const notificationService = new NotificationService(mockChannel);
      await notificationService.createNotification({
        userId: new mongoose.Types.ObjectId(testUserId),
        type: NotificationType.EMAIL,
        content: 'Test notification 1',
        subject: 'Subject 1'
      });
      
      await notificationService.createNotification({
        userId: new mongoose.Types.ObjectId(testUserId),
        type: NotificationType.SMS,
        content: 'Test notification 2'
      });
    });
    
    it('should return user notifications', async () => {
      // Act
      const response = await request(app)
        .get(`/api/users/${testUserId}/notifications`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      
      // Verify the notifications belong to the test user
      response.body.forEach((notification: any) => {
        expect(notification.userId).toBe(testUserId);
      });
      
      // Verify they're sorted by createdAt in descending order
      const dates = response.body.map((n: any) => new Date(n.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });
    
    it('should return 400 for invalid user ID format', async () => {
      // Act
      const response = await request(app)
        .get('/api/users/invalid-id/notifications');
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid userId format');
    });
  });
});
