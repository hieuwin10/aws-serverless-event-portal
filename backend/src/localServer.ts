import 'dotenv/config';
import express from 'express';
import { handler as getCategories } from './handlers/getCategories';
import { handler as getLocations } from './handlers/getLocations';
import { handler as getOrganizers } from './handlers/getOrganizers';
import { handler as getOrganizerById } from './handlers/getOrganizerById';
import { handler as getSpeakers } from './handlers/getSpeakers';
import { handler as getSpeakerById } from './handlers/getSpeakerById';
import { handler as getSponsors } from './handlers/getSponsors';
import { handler as getSponsorById } from './handlers/getSponsorById';
import { handler as getAuditLogs } from './handlers/getAuditLogs';
import { handler as getHomepageEventsView } from './handlers/getHomepageEventsView';
import { handler as getUsers } from './handlers/getUsers';
import { handler as getEvents } from './handlers/getEvents';
import { handler as getEventById } from './handlers/getEventById';
import { handler as getEventTickets } from './handlers/getEventTickets';
import { handler as getEventCheckins } from './handlers/getEventCheckins';
import { handler as checkinEventUser } from './handlers/checkinEventUser';
import { handler as getEventSpeakers } from './handlers/getEventSpeakers';
import { handler as linkEventSpeaker } from './handlers/linkEventSpeaker';
import { handler as getEventSponsors } from './handlers/getEventSponsors';
import { handler as linkEventSponsor } from './handlers/linkEventSponsor';
import { handler as createEventFeedback } from './handlers/createEventFeedback';
import { handler as getEventFeedbacks } from './handlers/getEventFeedbacks';
import { handler as createEvent } from './handlers/createEvent';
import { handler as updateEvent } from './handlers/updateEvent';
import { handler as deleteEvent } from './handlers/deleteEvent';
import { handler as registerEvent } from './handlers/registerEvent';
import { handler as getUserRegistrations } from './handlers/getUserRegistrations';
import { handler as getRecommendations } from './handlers/getRecommendations';
import { handler as exportEventICS } from './handlers/exportEventICS';
import { handler as qrCheckIn } from './handlers/qrCheckIn';
import { handler as submitReview } from './handlers/submitReview';
import { handler as joinWaitlist } from './handlers/joinWaitlist';
import { handler as createRegistrationPayment } from './handlers/createRegistrationPayment';
import { handler as getUserPayments } from './handlers/getUserPayments';
import { handler as getUserNotifications } from './handlers/getUserNotifications';
import { handler as markNotificationRead } from './handlers/markNotificationRead';
import { handler as getUserProfile } from './handlers/getUserProfile';
import { handler as cancelRegistration } from './handlers/cancelRegistration';
import { handler as getEventRegistrations } from './handlers/getEventRegistrations';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Enable CORS Middleware for Mock Server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auth Middleware: Simulates Cognito JWT Token Decoding
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    logger.info(`AuthMiddleware: Processing token: ${token}`);
    
    if (token === 'mock_admin_token' || token.includes('ADMIN')) {
      (req as any).userClaims = {
        sub: 'usr_admin_9999_9999_9999_9999',
        email: 'admin@eventapp.com',
        name: 'Quản Trị Viên',
        'cognito:groups': ['Admin'],
        role: 'Admin'
      };
    } else {
      // Decode user details or use defaults
      const decodedUser = token.replace('mock_user_token_', '');
      (req as any).userClaims = {
        sub: `usr_client_${decodedUser || 'c66ff888'}`,
        email: decodedUser ? `${decodedUser}@example.com` : 'user@example.com',
        name: decodedUser ? `User ${decodedUser}` : 'Nguyễn Văn A',
        'cognito:groups': [],
        role: 'User'
      };
    }
  }
  next();
});

// Helper to convert Express Request/Response to AWS API Gateway Proxy invocation
const handleLambda = (handlerFn: any) => {
  return async (req: express.Request, res: express.Response) => {
    try {
      const lambdaEvent = {
        queryStringParameters: Object.keys(req.query).length ? req.query : null,
        pathParameters: Object.keys(req.params).length ? req.params : null,
        body: req.body ? JSON.stringify(req.body) : null,
        requestContext: {
          authorizer: {
            claims: (req as any).userClaims || null
          }
        }
      };
      
      const result = await handlerFn(lambdaEvent as any);
      res.status(result.statusCode);
      
      // Set headers
      if (result.headers) {
        Object.entries(result.headers).forEach(([k, v]) => {
          res.setHeader(k, String(v));
        });
      }
      
      res.send(result.body);
    } catch (err: any) {
      logger.error('Mock API Gateway Execution Error', err);
      res.status(500).json({
        success: false,
        data: null,
        error: 'Mock API Gateway Internal Server Error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Map Endpoints to Handlers
app.get('/categories', handleLambda(getCategories));
app.get('/locations', handleLambda(getLocations));
app.get('/organizers', handleLambda(getOrganizers));
app.get('/organizers/:id', handleLambda(getOrganizerById));
app.get('/speakers', handleLambda(getSpeakers));
app.get('/speakers/:id', handleLambda(getSpeakerById));
app.get('/sponsors', handleLambda(getSponsors));
app.get('/sponsors/:id', handleLambda(getSponsorById));
app.get('/audit-logs', handleLambda(getAuditLogs));
app.get('/views/homepage-events', handleLambda(getHomepageEventsView));
app.get('/events', handleLambda(getEvents));
app.get('/events/recommendations', handleLambda(getRecommendations)); // Must be before /events/:id
app.get('/events/:id/tickets', handleLambda(getEventTickets));
app.get('/events/:id/checkins', handleLambda(getEventCheckins));
app.post('/events/:id/checkin/:userId', handleLambda(checkinEventUser));
app.get('/events/:id/speakers', handleLambda(getEventSpeakers));
app.post('/events/:id/speakers/:speakerId', handleLambda(linkEventSpeaker));
app.get('/events/:id/sponsors', handleLambda(getEventSponsors));
app.post('/events/:id/sponsors/:sponsorId', handleLambda(linkEventSponsor));
app.get('/events/:id/feedbacks', handleLambda(getEventFeedbacks));
app.post('/events/:id/feedback', handleLambda(createEventFeedback));
app.get('/events/:id', handleLambda(getEventById));
app.get('/events/:id/export', handleLambda(exportEventICS));
app.post('/events', handleLambda(createEvent));
app.put('/events/:id', handleLambda(updateEvent));
app.delete('/events/:id', handleLambda(deleteEvent));
app.post('/events/:id/register', handleLambda(registerEvent));
app.delete('/events/:id/register', handleLambda(cancelRegistration));
app.get('/events/:id/registrations', handleLambda(getEventRegistrations));
app.post('/events/:id/waitlist', handleLambda(joinWaitlist));
app.post('/events/:id/checkin', handleLambda(qrCheckIn));
app.post('/events/:id/reviews', handleLambda(submitReview));
app.post('/registrations/:registrationId/payments', handleLambda(createRegistrationPayment));
app.get('/users/payments', handleLambda(getUserPayments));
app.get('/users/notifications', handleLambda(getUserNotifications));
app.put('/users/notifications/:notificationId/read', handleLambda(markNotificationRead));
app.get('/users', handleLambda(getUsers));
app.get('/users/registrations', handleLambda(getUserRegistrations));
app.get('/users/profile', handleLambda(getUserProfile));

app.listen(PORT, () => {
  logger.info(`AWS API Gateway Express Mock Server is listening on http://localhost:${PORT}`);
});
