import fs from 'fs';
import path from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  ScanCommand, 
  QueryCommand, 
  UpdateCommand, 
  DeleteCommand 
} from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const DB_MODE = process.env.DB_MODE || 'mock';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'EventApp-Data';
const MOCK_DB_FILE = path.join(__dirname, '../../mock-db.json');

// Initialize AWS DynamoDB Client
let ddbDocClient: DynamoDBDocumentClient | null = null;
if (DB_MODE === 'dynamodb') {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined
  });
  ddbDocClient = DynamoDBDocumentClient.from(client);
}

// Initial Mock Database Seed
const INITIAL_EVENTS = [
  {
    PK: 'EVENT#evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    SK: 'METADATA',
    id: 'evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    title: 'Hội Thảo AWS Serverless Đột Phá 2026',
    category: 'technology',
    description: 'Chia sẻ kinh nghiệm thực tế về tối ưu hóa chi phí và xây dựng ứng dụng không máy chủ trên AWS.',
    date: '2026-06-15T09:00:00Z',
    location: 'Trực tuyến (Zoom)',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    totalSeats: 500,
    registeredCount: 142
  },
  {
    PK: 'EVENT#evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    SK: 'USER#usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888',
    registrationId: 'reg_77f88a99-4c7b-4fff-9999-2b0d7b3d222d',
    eventId: 'evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    userId: 'usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888',
    email: 'user@example.com',
    registeredAt: '2026-05-26T10:44:00Z',
    ticketCode: 'TKT-AWS-9B1D-8888'
  }
];

// Helper to read Mock Database
const readMockDb = (): any[] => {
  if (!fs.existsSync(MOCK_DB_FILE)) {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(INITIAL_EVENTS, null, 2), 'utf-8');
    return INITIAL_EVENTS;
  }
  try {
    const data = fs.readFileSync(MOCK_DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error reading mock DB file', error);
    return INITIAL_EVENTS;
  }
};

// Helper to write Mock Database
const writeMockDb = (data: any[]): void => {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error writing mock DB file', error);
  }
};

export const dbService = {
  // Get an item (PK + SK)
  getItem: async (pk: string, sk: string): Promise<any | null> => {
    logger.info(`dbService.getItem: pk=${pk}, sk=${sk}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const match = items.find(item => item.PK === pk && item.SK === sk);
      return match || null;
    } else {
      const result = await ddbDocClient!.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk }
      }));
      return result.Item || null;
    }
  },

  // Put an item
  putItem: async (item: any): Promise<void> => {
    logger.info(`dbService.putItem: pk=${item.PK}, sk=${item.SK}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const idx = items.findIndex(i => i.PK === item.PK && i.SK === item.SK);
      if (idx !== -1) {
        items[idx] = item;
      } else {
        items.push(item);
      }
      writeMockDb(items);
    } else {
      await ddbDocClient!.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));
    }
  },

  // Scan for metadata (e.g. all events)
  scanEvents: async (category?: string, search?: string): Promise<any[]> => {
    logger.info(`dbService.scanEvents: category=${category}, search=${search}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      let events = items.filter(item => item.SK === 'METADATA');
      if (category) {
        events = events.filter(e => e.category === category);
      }
      if (search) {
        const query = search.toLowerCase();
        events = events.filter(e => 
          e.title.toLowerCase().includes(query) || 
          e.description.toLowerCase().includes(query)
        );
      }
      return events;
    } else {
      // Production scanning
      let filterExpression = 'SK = :sk';
      const expressionAttributeValues: any = { ':sk': 'METADATA' };

      if (category) {
        filterExpression += ' AND category = :category';
        expressionAttributeValues[':category'] = category;
      }

      const result = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues
      }));
      let events = result.Items || [];
      if (search) {
        const query = search.toLowerCase();
        events = events.filter((e: any) => 
          e.title?.toLowerCase().includes(query) || 
          e.description?.toLowerCase().includes(query)
        );
      }
      return events;
    }
  },

  // Query by PK begins_with USER# to get registrants of an event
  getEventRegistrations: async (eventId: string): Promise<any[]> => {
    const pk = `EVENT#${eventId}`;
    logger.info(`dbService.getEventRegistrations: eventId=${eventId}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      return items.filter(item => item.PK === pk && item.SK.startsWith('USER#'));
    } else {
      const result = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':skPrefix': 'USER#'
        }
      }));
      return result.Items || [];
    }
  },

  // Query waitlist entries for an event
  getEventWaitlist: async (eventId: string): Promise<any[]> => {
    const pk = `EVENT#${eventId}`;
    logger.info(`dbService.getEventWaitlist: eventId=${eventId}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      return items
        .filter(item => item.PK === pk && item.SK?.startsWith('WAITLIST#'))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } else {
      const result = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':skPrefix': 'WAITLIST#'
        }
      }));
      return result.Items || [];
    }
  },

  // Query reviews for an event
  getEventReviews: async (eventId: string): Promise<any[]> => {
    const pk = `EVENT#${eventId}`;
    logger.info(`dbService.getEventReviews: eventId=${eventId}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      return items
        .filter(item => item.PK === pk && item.SK?.startsWith('REVIEW#'))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else {
      const result = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':skPrefix': 'REVIEW#'
        }
      }));
      return result.Items || [];
    }
  },

  // Query GSI (UserRegistrationsIndex) to get all events registered by user
  getUserRegistrations: async (userId: string): Promise<any[]> => {
    logger.info(`dbService.getUserRegistrations: userId=${userId}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const skVal = `USER#${userId}`;
      const registrations = items.filter(item => item.SK === skVal && item.PK.startsWith('EVENT#'));
      
      // Load event metadata for each registration
      const enriched = registrations.map(reg => {
        const eventMeta = items.find(item => item.PK === reg.PK && item.SK === 'METADATA');
        return {
          ...reg,
          event: eventMeta || null
        };
      });
      return enriched;
    } else {
      const result = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'UserRegistrationsIndex',
        KeyConditionExpression: 'SK = :gsiPk AND begins_with(PK, :gsiSkPrefix)',
        ExpressionAttributeValues: {
          ':gsiPk': `USER#${userId}`,
          ':gsiSkPrefix': 'EVENT#'
        }
      }));
      const registrations = result.Items || [];
      
      // Hydrate event metadata
      const enriched = [];
      for (const reg of registrations) {
        const eventRes = await ddbDocClient!.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: reg.PK, SK: 'METADATA' }
        }));
        enriched.push({
          ...reg,
          event: eventRes.Item || null
        });
      }
      return enriched;
    }
  },

  // Update item (Update registration counts or metadata)
  updateEventSeats: async (eventId: string, increment: number): Promise<void> => {
    const pk = `EVENT#${eventId}`;
    logger.info(`dbService.updateEventSeats: eventId=${eventId}, increment=${increment}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const idx = items.findIndex(item => item.PK === pk && item.SK === 'METADATA');
      if (idx !== -1) {
        items[idx].registeredCount = (items[idx].registeredCount || 0) + increment;
        writeMockDb(items);
      }
    } else {
      await ddbDocClient!.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: 'METADATA' },
        UpdateExpression: 'ADD registeredCount :inc',
        ExpressionAttributeValues: {
          ':inc': increment
        }
      }));
    }
  },

  // Delete event and registrations
  deleteEvent: async (eventId: string): Promise<void> => {
    const pk = `EVENT#${eventId}`;
    logger.info(`dbService.deleteEvent: eventId=${eventId}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const remaining = items.filter(item => item.PK !== pk);
      writeMockDb(remaining);
    } else {
      // First, get all items belonging to the event partition
      const result = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk }
      }));
      const itemsToDelete = result.Items || [];
      for (const item of itemsToDelete) {
        await ddbDocClient!.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: item.SK }
        }));
      }
    }
  }
};
