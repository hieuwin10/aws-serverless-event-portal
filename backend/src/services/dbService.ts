import fs from 'fs';
import path from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  QueryCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const DB_MODE = process.env.DB_MODE || 'mock';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'EventApp-Data';
const MOCK_DB_FILE = path.join(__dirname, '../../mock-db.json');

const DEFAULT_USERS = [
  {
    userId: 'usr_admin_9999_9999_9999_9999',
    email: 'admin@eventapp.com',
    fullName: 'Admin User',
    role: 'Admin'
  },
  {
    userId: 'usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888',
    email: 'user@example.com',
    fullName: 'Sample User',
    role: 'User'
  }
];

const DEFAULT_CATEGORIES = [
  {
    categoryId: 'technology',
    name: 'Technology',
    description: 'Technology and cloud events'
  },
  {
    categoryId: 'education',
    name: 'Education',
    description: 'Education and learning events'
  },
  {
    categoryId: 'music',
    name: 'Music',
    description: 'Music and entertainment events'
  }
];

const DEFAULT_LOCATIONS = [
  {
    locationId: 'online',
    venueName: 'Online - Zoom',
    address: '',
    city: 'Online',
    country: 'Vietnam'
  },
  {
    locationId: 'hcm',
    venueName: 'Ho Chi Minh City Campus',
    address: '',
    city: 'Ho Chi Minh City',
    country: 'Vietnam'
  },
  {
    locationId: 'hanoi',
    venueName: 'Hanoi Event Hall',
    address: '',
    city: 'Hanoi',
    country: 'Vietnam'
  }
];

const DEFAULT_TICKET_ID = 'GENERAL';

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
    PK: 'USER#usr_admin_9999_9999_9999_9999',
    SK: 'METADATA',
    entityType: 'USER',
    userId: 'usr_admin_9999_9999_9999_9999',
    email: 'admin@eventapp.com',
    fullName: 'Admin User',
    role: 'Admin',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'EVENT#evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    SK: 'TICKET#GENERAL',
    entityType: 'TICKET',
    ticketId: 'GENERAL',
    eventId: 'evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    ticketName: 'General Admission',
    price: 0,
    currency: 'VND',
    totalQuantity: 500,
    remainingQuantity: 358,
    salesStart: '2026-06-15T09:00:00Z',
    salesEnd: '2026-06-15T12:00:00Z',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-26T10:44:00Z'
  },
  {
    PK: 'USER#usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888',
    SK: 'METADATA',
    entityType: 'USER',
    userId: 'usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888',
    email: 'user@example.com',
    fullName: 'Sample User',
    role: 'User',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'CAT#technology',
    SK: 'METADATA',
    entityType: 'CATEGORY',
    categoryId: 'technology',
    name: 'Technology',
    description: 'Technology and cloud events',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'CAT#education',
    SK: 'METADATA',
    entityType: 'CATEGORY',
    categoryId: 'education',
    name: 'Education',
    description: 'Education and learning events',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'CAT#music',
    SK: 'METADATA',
    entityType: 'CATEGORY',
    categoryId: 'music',
    name: 'Music',
    description: 'Music and entertainment events',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'LOC#online',
    SK: 'METADATA',
    entityType: 'LOCATION',
    locationId: 'online',
    venueName: 'Online - Zoom',
    address: '',
    city: 'Online',
    country: 'Vietnam',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'LOC#hcm',
    SK: 'METADATA',
    entityType: 'LOCATION',
    locationId: 'hcm',
    venueName: 'Ho Chi Minh City Campus',
    address: '',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'LOC#hanoi',
    SK: 'METADATA',
    entityType: 'LOCATION',
    locationId: 'hanoi',
    venueName: 'Hanoi Event Hall',
    address: '',
    city: 'Hanoi',
    country: 'Vietnam',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'EVENT#evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    SK: 'METADATA',
    entityType: 'EVENT',
    eventId: 'evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    organizerId: 'usr_admin_9999_9999_9999_9999',
    categoryId: 'technology',
    locationId: 'virtual-zoom',
    title: 'Há»™i Tháº£o AWS Serverless Äá»™t PhÃ¡ 2026',
    description: 'Chia sáº» kinh nghiá»‡m thá»±c táº¿ vá» tá»‘i Æ°u hÃ³a chi phÃ­ vÃ  xÃ¢y dá»±ng á»©ng dá»¥ng khÃ´ng mÃ¡y chá»§ trÃªn AWS.',
    startTime: '2026-06-15T09:00:00Z',
    endTime: '2026-06-15T12:00:00Z',
    remainingSeats: 358,
    totalSeats: 500,
    status: 'PUBLISHED',
    GSI1PK: 'CAT#technology',
    GSI1SK: 'START#2026-06-15T09:00:00Z#EVENT#evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-26T10:44:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    // Compatibility fields for current frontend/local mock behavior
    id: 'evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    category: 'technology',
    date: '2026-06-15T09:00:00Z',
    location: 'Trá»±c tuyáº¿n (Zoom)',
    registeredCount: 142
  },
  {
    PK: 'USER#usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888',
    SK: 'EVENT#evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    entityType: 'REGISTRATION',
    registrationId: 'reg_77f88a99-4c7b-4fff-9999-2b0d7b3d222d',
    userId: 'usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888',
    eventId: 'evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    ticketId: 'TKT-AWS-9B1D-8888',
    ticketCode: 'TKT-AWS-9B1D-8888',
    status: 'REGISTERED',
    paymentState: 'FREE',
    GSI2PK: 'EVENT#evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    GSI2SK: 'USER#usr_c66ff888-2c2c-4aaa-bbb-8b0d7b3d8888',
    registeredAt: '2026-05-26T10:44:00Z',
    createdAt: '2026-05-26T10:44:00Z',
    updatedAt: '2026-05-26T10:44:00Z',
    email: 'user@example.com',
    requestId: 'reg_77f88a99-4c7b-4fff-9999-2b0d7b3d222d'
  }
];

export const buildEventKeys = (eventId: string) => ({
  PK: `EVENT#${eventId}`,
  SK: 'METADATA'
});

export const buildTicketKeys = (eventId: string, ticketId: string) => ({
  PK: `EVENT#${eventId}`,
  SK: `TICKET#${ticketId}`
});

export const buildUserKeys = (userId: string) => ({
  PK: `USER#${userId}`,
  SK: 'METADATA'
});

export const buildCategoryKeys = (categoryId: string) => ({
  PK: `CAT#${normalizeCategory(categoryId)}`,
  SK: 'METADATA'
});

export const buildLocationKeys = (locationId: string) => ({
  PK: `LOC#${normalizeCategory(locationId)}`,
  SK: 'METADATA'
});

export const buildRegistrationKeys = (userId: string, eventId: string) => ({
  PK: `USER#${userId}`,
  SK: `EVENT#${eventId}`,
  GSI2PK: `EVENT#${eventId}`,
  GSI2SK: `USER#${userId}`
});

export const normalizeCategory = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
};

export const mapEventItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  const eventIdFromPk =
    typeof item.PK === 'string' && item.PK.startsWith('EVENT#')
      ? item.PK.slice('EVENT#'.length)
      : '';

  const totalSeats = Number(item.totalSeats || 0);
  const remainingSeats = Number(item.remainingSeats || 0);
  const registeredCount =
    item.registeredCount !== undefined
      ? Number(item.registeredCount || 0)
      : Math.max(0, totalSeats - remainingSeats);

  return {
    id: item.id || item.eventId || eventIdFromPk,
    title: item.title || '',
    category: normalizeCategory(item.category || item.categoryId),
    description: item.description || '',
    date: item.date || item.startTime || '',
    location: item.location || item.locationName || item.venueName || item.locationId || '',
    imageUrl: item.imageUrl || item.bannerUrl || '',
    totalSeats,
    registeredCount
  };
};

export const mapTicketItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  return {
    ticketId: item.ticketId || '',
    ticketName: item.ticketName || '',
    price: Number(item.price || 0),
    currency: item.currency || 'VND',
    remainingQuantity: Number(item.remainingQuantity || 0),
    totalQuantity: Number(item.totalQuantity || 0)
  };
};

export const mapUserItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  const userIdFromPk =
    typeof item.PK === 'string' && item.PK.startsWith('USER#')
      ? item.PK.slice('USER#'.length)
      : '';

  return {
    id: item.userId || userIdFromPk,
    email: item.email || '',
    fullName: item.fullName || item.name || '',
    role: item.role || 'User'
  };
};

export const mapCategoryItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  const categoryIdFromPk =
    typeof item.PK === 'string' && item.PK.startsWith('CAT#')
      ? item.PK.slice('CAT#'.length)
      : '';

  return {
    id: normalizeCategory(item.categoryId || categoryIdFromPk),
    name: item.name || item.categoryName || ''
  };
};

export const mapLocationItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  const locationIdFromPk =
    typeof item.PK === 'string' && item.PK.startsWith('LOC#')
      ? item.PK.slice('LOC#'.length)
      : '';

  return {
    id: normalizeCategory(item.locationId || locationIdFromPk),
    venueName: item.venueName || '',
    city: item.city || '',
    country: item.country || ''
  };
};

export const mapRegistrationItemToDto = (item: any, eventItem?: any): any | null => {
  if (!item) {
    return null;
  }

  const mappedEvent =
    eventItem !== undefined
      ? mapEventItemToDto(eventItem)
      : item.event
        ? mapEventItemToDto(item.event)
        : null;

  return {
    registrationId: item.registrationId || '',
    eventId: item.eventId || '',
    userId: item.userId || '',
    email: item.email || '',
    registeredAt: item.registeredAt || item.createdAt || '',
    ticketCode: item.ticketCode || item.ticketId || '',
    event: mappedEvent
  };
};

const extractEventIdFromRegistration = (item: any): string => {
  if (!item) {
    return '';
  }

  if (typeof item.eventId === 'string' && item.eventId) {
    return item.eventId;
  }

  if (typeof item.SK === 'string' && item.SK.startsWith('EVENT#')) {
    return item.SK.slice('EVENT#'.length);
  }

  if (typeof item.PK === 'string' && item.PK.startsWith('EVENT#')) {
    return item.PK.slice('EVENT#'.length);
  }

  return '';
};

const extractUserIdFromRegistration = (item: any): string => {
  if (!item) {
    return '';
  }

  if (typeof item.userId === 'string' && item.userId) {
    return item.userId;
  }

  if (typeof item.GSI2SK === 'string' && item.GSI2SK.startsWith('USER#')) {
    return item.GSI2SK.slice('USER#'.length);
  }

  if (typeof item.SK === 'string' && item.SK.startsWith('USER#')) {
    return item.SK.slice('USER#'.length);
  }

  if (typeof item.PK === 'string' && item.PK.startsWith('USER#')) {
    return item.PK.slice('USER#'.length);
  }

  return '';
};

const calculateRegisteredCount = (item: any): number => {
  if (!item) {
    return 0;
  }

  if (item.registeredCount !== undefined) {
    return Number(item.registeredCount || 0);
  }

  const totalSeats = Number(item.totalSeats || 0);
  const remainingSeats = Number(item.remainingSeats || 0);
  return Math.max(0, totalSeats - remainingSeats);
};

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

  // Get event metadata by eventId and map to the current frontend DTO
  getEventById: async (eventId: string): Promise<any | null> => {
    const keys = buildEventKeys(eventId);
    logger.info(`dbService.getEventById: eventId=${eventId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'EVENT') {
      return null;
    }

    return mapEventItemToDto(item);
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

  // Create a ticket item using the TICKET schema
  createTicketItem: async (input: {
    eventId: string;
    ticketId: string;
    ticketName: string;
    price: number;
    currency: string;
    totalQuantity: number;
    remainingQuantity: number;
    salesStart: string;
    salesEnd: string;
  }): Promise<any> => {
    const now = new Date().toISOString();
    const keys = buildTicketKeys(input.eventId, input.ticketId);
    const existingTicket = await dbService.getItem(keys.PK, keys.SK);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'TICKET',
      ticketId: input.ticketId,
      eventId: input.eventId,
      ticketName: input.ticketName,
      price: Number(input.price),
      currency: input.currency,
      totalQuantity: Number(input.totalQuantity),
      remainingQuantity: Number(input.remainingQuantity),
      salesStart: input.salesStart,
      salesEnd: input.salesEnd,
      createdAt: existingTicket?.createdAt || now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Get ticket metadata by eventId and ticketId
  getTicketById: async (eventId: string, ticketId: string): Promise<any | null> => {
    const keys = buildTicketKeys(eventId, ticketId);
    logger.info(`dbService.getTicketById: eventId=${eventId}, ticketId=${ticketId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'TICKET') {
      return null;
    }

    return mapTicketItemToDto(item);
  },

  // List tickets for an event, creating the default GENERAL ticket for legacy events when missing
  listTicketsByEvent: async (eventId: string): Promise<any[]> => {
    logger.info(`dbService.listTicketsByEvent: eventId=${eventId}`);
    const eventKeys = buildEventKeys(eventId);

    const getTicketItems = async (): Promise<any[]> => {
      if (DB_MODE === 'mock') {
        const items = readMockDb();
        return items.filter(
          item =>
            item.PK === eventKeys.PK &&
            typeof item.SK === 'string' &&
            item.SK.startsWith('TICKET#') &&
            item.entityType === 'TICKET'
        );
      }

      const result = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': eventKeys.PK,
          ':skPrefix': 'TICKET#'
        }
      }));

      return (result.Items || []).filter((item: any) => item.entityType === 'TICKET');
    };

    let ticketItems = await getTicketItems();
    const hasGeneralTicket = ticketItems.some(item => item.ticketId === DEFAULT_TICKET_ID);

    if (!hasGeneralTicket) {
      const eventItem = await dbService.getItem(eventKeys.PK, eventKeys.SK);
      if (eventItem && (!eventItem.entityType || eventItem.entityType === 'EVENT')) {
        const totalQuantity = Number(eventItem.totalSeats || 0);
        const remainingQuantity =
          eventItem.remainingSeats !== undefined
            ? Number(eventItem.remainingSeats || 0)
            : Math.max(0, totalQuantity - calculateRegisteredCount(eventItem));
        const defaultTicket = await dbService.createTicketItem({
          eventId,
          ticketId: DEFAULT_TICKET_ID,
          ticketName: 'General Admission',
          price: 0,
          currency: 'VND',
          totalQuantity,
          remainingQuantity,
          salesStart: eventItem.startTime || eventItem.createdAt || new Date().toISOString(),
          salesEnd: eventItem.endTime || eventItem.startTime || eventItem.createdAt || ''
        });

        ticketItems = [...ticketItems, defaultTicket];
      }
    }

    return ticketItems
      .map(item => mapTicketItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.ticketId));
  },

  // Decrement ticket remaining quantity while preserving existing registration behavior
  decrementTicketRemainingQuantity: async (eventId: string, ticketId: string): Promise<any | null> => {
    const keys = buildTicketKeys(eventId, ticketId);
    logger.info(`dbService.decrementTicketRemainingQuantity: eventId=${eventId}, ticketId=${ticketId}`);

    const existingTicket = await dbService.getItem(keys.PK, keys.SK);
    if (!existingTicket) {
      return null;
    }

    if (existingTicket.entityType && existingTicket.entityType !== 'TICKET') {
      return null;
    }

    const currentRemainingQuantity = Number(existingTicket.remainingQuantity || 0);
    const updatedTicket = {
      ...existingTicket,
      remainingQuantity: Math.max(0, currentRemainingQuantity - 1),
      updatedAt: new Date().toISOString()
    };

    await dbService.putItem(updatedTicket);
    return updatedTicket;
  },

  // List users and seed the default USER metadata items when they are missing
  listUsers: async (): Promise<any[]> => {
    logger.info('dbService.listUsers');

    const getUserItems = async (): Promise<any[]> => {
      if (DB_MODE === 'mock') {
        const items = readMockDb();
        return items.filter(item => item.entityType === 'USER');
      }

      const result = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :userType AND SK = :sk',
        ExpressionAttributeValues: {
          ':userType': 'USER',
          ':sk': 'METADATA'
        }
      }));

      return result.Items || [];
    };

    const userItems = await getUserItems();
    const userMap = new Map<string, any>();
    for (const item of userItems) {
      const userId = item.userId || item.PK?.replace('USER#', '');
      if (userId) {
        userMap.set(userId, item);
      }
    }

    for (const user of DEFAULT_USERS) {
      if (!userMap.has(user.userId)) {
        const createdUser = await dbService.createUserItem(user);
        userMap.set(user.userId, createdUser);
      }
    }

    const defaultUserOrder = new Map(
      DEFAULT_USERS.map((user, index) => [user.userId, index])
    );

    return Array.from(userMap.values())
      .map(item => mapUserItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.id))
      .sort((a, b) => {
        const orderA = defaultUserOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = defaultUserOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.email.localeCompare(b.email);
      });
  },

  // Create a user metadata item using the USER schema
  createUserItem: async (input: {
    userId: string;
    email: string;
    fullName?: string;
    role?: string;
  }): Promise<any> => {
    const now = new Date().toISOString();
    const keys = buildUserKeys(input.userId);
    const email = input.email.trim().toLowerCase();

    const existingUser = await dbService.getItem(keys.PK, keys.SK);
    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'USER',
      userId: input.userId,
      email,
      fullName: input.fullName || email,
      role: input.role || 'User',
      createdAt: existingUser?.createdAt || now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Get user metadata by userId
  getUserById: async (userId: string): Promise<any | null> => {
    const keys = buildUserKeys(userId);
    logger.info(`dbService.getUserById: userId=${userId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'USER') {
      return null;
    }

    return mapUserItemToDto(item);
  },

  // Get user metadata by email
  getUserByEmail: async (email: string): Promise<any | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    logger.info(`dbService.getUserByEmail: email=${normalizedEmail}`);

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const item = items.find(
        user =>
          user.entityType === 'USER' &&
          typeof user.email === 'string' &&
          user.email.trim().toLowerCase() === normalizedEmail
      );

      return mapUserItemToDto(item || null);
    }

    const result = await ddbDocClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :userType AND SK = :sk AND email = :email',
      ExpressionAttributeValues: {
        ':userType': 'USER',
        ':sk': 'METADATA',
        ':email': normalizedEmail
      }
    }));

    const item = (result.Items || [])[0];
    return mapUserItemToDto(item || null);
  },

  // List categories and seed the default CATEGORY items when they are missing
  listCategories: async (): Promise<any[]> => {
    logger.info('dbService.listCategories');

    const getCategoryItems = async (): Promise<any[]> => {
      if (DB_MODE === 'mock') {
        const items = readMockDb();
        return items.filter(item => item.entityType === 'CATEGORY');
      }

      const result = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :categoryType AND SK = :sk',
        ExpressionAttributeValues: {
          ':categoryType': 'CATEGORY',
          ':sk': 'METADATA'
        }
      }));

      return result.Items || [];
    };

    const categoryItems = await getCategoryItems();
    const categoryMap = new Map<string, any>();
    for (const item of categoryItems) {
      const categoryId = normalizeCategory(item.categoryId || item.PK?.replace('CAT#', ''));
      if (categoryId) {
        categoryMap.set(categoryId, item);
      }
    }

    for (const category of DEFAULT_CATEGORIES) {
      if (!categoryMap.has(category.categoryId)) {
        const createdCategory = await dbService.createCategoryItem(category);
        categoryMap.set(category.categoryId, createdCategory);
      }
    }

    const defaultCategoryOrder = new Map(
      DEFAULT_CATEGORIES.map((category, index) => [category.categoryId, index])
    );

    return Array.from(categoryMap.values())
      .map(item => mapCategoryItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.id))
      .sort((a, b) => {
        const orderA = defaultCategoryOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = defaultCategoryOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name);
      });
  },

  // Get category metadata by categoryId
  getCategoryById: async (categoryId: string): Promise<any | null> => {
    const normalizedCategoryId = normalizeCategory(categoryId);
    const keys = buildCategoryKeys(normalizedCategoryId);
    logger.info(`dbService.getCategoryById: categoryId=${normalizedCategoryId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'CATEGORY') {
      return null;
    }

    return mapCategoryItemToDto(item);
  },

  // Create a category item using the CATEGORY schema
  createCategoryItem: async (input: {
    categoryId: string;
    name: string;
    description?: string;
  }): Promise<any> => {
    const categoryId = normalizeCategory(input.categoryId);
    const now = new Date().toISOString();
    const keys = buildCategoryKeys(categoryId);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'CATEGORY',
      categoryId,
      name: input.name,
      description: input.description || '',
      createdAt: now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // List locations and seed the default LOCATION items when they are missing
  listLocations: async (): Promise<any[]> => {
    logger.info('dbService.listLocations');

    const getLocationItems = async (): Promise<any[]> => {
      if (DB_MODE === 'mock') {
        const items = readMockDb();
        return items.filter(item => item.entityType === 'LOCATION');
      }

      const result = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :locationType AND SK = :sk',
        ExpressionAttributeValues: {
          ':locationType': 'LOCATION',
          ':sk': 'METADATA'
        }
      }));

      return result.Items || [];
    };

    const locationItems = await getLocationItems();
    const locationMap = new Map<string, any>();
    for (const item of locationItems) {
      const locationId = normalizeCategory(item.locationId || item.PK?.replace('LOC#', ''));
      if (locationId) {
        locationMap.set(locationId, item);
      }
    }

    for (const location of DEFAULT_LOCATIONS) {
      if (!locationMap.has(location.locationId)) {
        const createdLocation = await dbService.createLocationItem(location);
        locationMap.set(location.locationId, createdLocation);
      }
    }

    const defaultLocationOrder = new Map(
      DEFAULT_LOCATIONS.map((location, index) => [location.locationId, index])
    );

    return Array.from(locationMap.values())
      .map(item => mapLocationItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.id))
      .sort((a, b) => {
        const orderA = defaultLocationOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = defaultLocationOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.venueName.localeCompare(b.venueName);
      });
  },

  // Get location metadata by locationId
  getLocationById: async (locationId: string): Promise<any | null> => {
    const normalizedLocationId = normalizeCategory(locationId);
    const keys = buildLocationKeys(normalizedLocationId);
    logger.info(`dbService.getLocationById: locationId=${normalizedLocationId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'LOCATION') {
      return null;
    }

    return mapLocationItemToDto(item);
  },

  // Create a location item using the LOCATION schema
  createLocationItem: async (input: {
    locationId: string;
    venueName: string;
    address?: string;
    city: string;
    country: string;
  }): Promise<any> => {
    const locationId = normalizeCategory(input.locationId);
    const now = new Date().toISOString();
    const keys = buildLocationKeys(locationId);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'LOCATION',
      locationId,
      venueName: input.venueName,
      address: input.address || '',
      city: input.city,
      country: input.country,
      createdAt: now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Create an event item using the new EVENT schema
  createEventItem: async (input: {
    eventId: string;
    organizerId: string;
    categoryId: string;
    locationId: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    totalSeats: number;
    remainingSeats: number;
    status: string;
    imageUrl?: string;
  }): Promise<any> => {
    const now = new Date().toISOString();
    const keys = buildEventKeys(input.eventId);
    const categoryId = normalizeCategory(input.categoryId);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'EVENT',
      eventId: input.eventId,
      organizerId: input.organizerId,
      categoryId,
      locationId: input.locationId,
      title: input.title,
      description: input.description || '',
      startTime: input.startTime,
      endTime: input.endTime,
      remainingSeats: Number(input.remainingSeats),
      totalSeats: Number(input.totalSeats),
      status: input.status,
      GSI1PK: `CAT#${categoryId}`,
      GSI1SK: `START#${input.startTime}#EVENT#${input.eventId}`,
      createdAt: now,
      updatedAt: now,
      imageUrl: input.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'
    };

    await dbService.putItem(item);
    await dbService.createTicketItem({
      eventId: input.eventId,
      ticketId: DEFAULT_TICKET_ID,
      ticketName: 'General Admission',
      price: 0,
      currency: 'VND',
      totalQuantity: Number(input.totalSeats),
      remainingQuantity: Number(input.totalSeats),
      salesStart: input.startTime || now,
      salesEnd: input.endTime || input.startTime || now
    });

    return item;
  },

  // Update an event item using the new EVENT schema while keeping compatibility fields
  updateEventItem: async (
    eventId: string,
    patch: {
      title?: string;
      description?: string;
      categoryId?: string;
      locationId?: string;
      startTime?: string;
      endTime?: string;
      totalSeats?: number;
      remainingSeats?: number;
      status?: string;
      imageUrl?: string;
    }
  ): Promise<any | null> => {
    const keys = buildEventKeys(eventId);
    logger.info(`dbService.updateEventItem: eventId=${eventId}`);

    const existingItem = await dbService.getItem(keys.PK, keys.SK);
    if (!existingItem) {
      return null;
    }

    if (existingItem.entityType && existingItem.entityType !== 'EVENT') {
      return null;
    }

    const updatedItem = { ...existingItem };
    const now = new Date().toISOString();
    const nextCategoryId =
      patch.categoryId !== undefined
        ? normalizeCategory(patch.categoryId)
        : normalizeCategory(existingItem.categoryId || existingItem.category);
    const nextStartTime = patch.startTime ?? existingItem.startTime ?? existingItem.date ?? '';
    const nextEndTime = patch.endTime ?? existingItem.endTime ?? nextStartTime;
    const currentRegisteredCount = calculateRegisteredCount(existingItem);
    const nextTotalSeats =
      patch.totalSeats !== undefined
        ? Number(patch.totalSeats)
        : Number(existingItem.totalSeats || 0);
    const nextRemainingSeats =
      patch.remainingSeats !== undefined
        ? Number(patch.remainingSeats)
        : Math.max(0, nextTotalSeats - currentRegisteredCount);

    updatedItem.PK = keys.PK;
    updatedItem.SK = keys.SK;
    updatedItem.entityType = 'EVENT';
    updatedItem.eventId = existingItem.eventId || eventId;
    updatedItem.id = existingItem.id || eventId;
    updatedItem.organizerId = existingItem.organizerId || '';
    updatedItem.categoryId = nextCategoryId;
    updatedItem.locationId = patch.locationId ?? existingItem.locationId ?? existingItem.location ?? '';
    updatedItem.title = patch.title ?? existingItem.title ?? '';
    updatedItem.description = patch.description ?? existingItem.description ?? '';
    updatedItem.startTime = nextStartTime;
    updatedItem.endTime = nextEndTime;
    updatedItem.totalSeats = nextTotalSeats;
    updatedItem.remainingSeats = nextRemainingSeats;
    updatedItem.status = patch.status ?? existingItem.status ?? 'PUBLISHED';
    updatedItem.imageUrl = patch.imageUrl ?? existingItem.imageUrl ?? '';
    updatedItem.updatedAt = now;
    updatedItem.createdAt = existingItem.createdAt || now;
    updatedItem.GSI1PK = `CAT#${nextCategoryId}`;
    updatedItem.GSI1SK = `START#${nextStartTime}#EVENT#${eventId}`;

    // Compatibility fields for current frontend DTO mapping during transition
    updatedItem.category = nextCategoryId;
    updatedItem.date = nextStartTime;
    updatedItem.location = updatedItem.locationId;
    updatedItem.registeredCount = currentRegisteredCount;

    await dbService.putItem(updatedItem);
    return updatedItem;
  },

  // List events by category while keeping the current frontend DTO
  listEventsByCategory: async (category: string, search?: string): Promise<any[]> => {
    const normalizedCategory = normalizeCategory(category);
    logger.info(`dbService.listEventsByCategory: category=${normalizedCategory}, search=${search}`);

    if (DB_MODE === 'mock') {
      const items = readMockDb();

      const newSchemaEvents = items.filter(
        item =>
          item.entityType === 'EVENT' &&
          normalizeCategory(item.categoryId || item.category) === normalizedCategory
      );

      const legacyEvents = items.filter(
        item =>
          item.SK === 'METADATA' &&
          typeof item.PK === 'string' &&
          item.PK.startsWith('EVENT#') &&
          normalizeCategory(item.category || item.categoryId) === normalizedCategory
      );

      const eventMap = new Map<string, any>();
      for (const item of legacyEvents) {
        const key = item.eventId || item.id || item.PK;
        eventMap.set(key, item);
      }
      for (const item of newSchemaEvents) {
        const key = item.eventId || item.id || item.PK;
        eventMap.set(key, item);
      }

      let eventItems = Array.from(eventMap.values());
      if (search) {
        const query = search.toLowerCase();
        eventItems = eventItems.filter(item =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }

      return eventItems
        .map(item => mapEventItemToDto(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
    } else {
      const eventMap = new Map<string, any>();

      const gsiResult = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1Index',
        KeyConditionExpression: 'GSI1PK = :gsiPk AND begins_with(GSI1SK, :gsiSkPrefix)',
        ExpressionAttributeValues: {
          ':gsiPk': `CAT#${normalizedCategory}`,
          ':gsiSkPrefix': 'START#'
        }
      }));

      for (const item of gsiResult.Items || []) {
        const key = (item as any).eventId || (item as any).id || (item as any).PK;
        eventMap.set(key, item);
      }

      const legacyScanResult = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          'attribute_not_exists(entityType) AND SK = :sk AND begins_with(PK, :eventPkPrefix) AND category = :category',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
          ':eventPkPrefix': 'EVENT#',
          ':category': normalizedCategory
        }
      }));

      for (const item of legacyScanResult.Items || []) {
        const key = (item as any).eventId || (item as any).id || (item as any).PK;
        if (!eventMap.has(key)) {
          eventMap.set(key, item);
        }
      }

      let eventItems = Array.from(eventMap.values());
      if (search) {
        const query = search.toLowerCase();
        eventItems = eventItems.filter((item: any) =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }

      return eventItems
        .map((item: any) => mapEventItemToDto(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }
  },

  // List events without category filtering while keeping the current frontend DTO
  listEvents: async (search?: string): Promise<any[]> => {
    logger.info(`dbService.listEvents: search=${search}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();

      const newSchemaEvents = items.filter(item => item.entityType === 'EVENT');
      const legacyEvents = items.filter(
        item =>
          item.SK === 'METADATA' &&
          typeof item.PK === 'string' &&
          item.PK.startsWith('EVENT#')
      );

      const eventMap = new Map<string, any>();
      for (const item of legacyEvents) {
        const key = item.eventId || item.id || item.PK;
        eventMap.set(key, item);
      }
      for (const item of newSchemaEvents) {
        const key = item.eventId || item.id || item.PK;
        eventMap.set(key, item);
      }

      let eventItems = Array.from(eventMap.values());

      if (search) {
        const query = search.toLowerCase();
        eventItems = eventItems.filter(item =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }

      return eventItems
        .map(item => mapEventItemToDto(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
    } else {
      const result = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          'entityType = :eventType OR (attribute_not_exists(entityType) AND SK = :sk AND begins_with(PK, :eventPkPrefix))',
        ExpressionAttributeValues: {
          ':eventType': 'EVENT',
          ':sk': 'METADATA',
          ':eventPkPrefix': 'EVENT#'
        }
      }));

      let eventItems = result.Items || [];
      if (search) {
        const query = search.toLowerCase();
        eventItems = eventItems.filter((item: any) =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }

      return eventItems
        .map((item: any) => mapEventItemToDto(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }
  },

  // Get a registration by the new REGISTRATION primary key
  getRegistrationByUserAndEvent: async (userId: string, eventId: string): Promise<any | null> => {
    const keys = buildRegistrationKeys(userId, eventId);
    logger.info(`dbService.getRegistrationByUserAndEvent: userId=${userId}, eventId=${eventId}`);
    return dbService.getItem(keys.PK, keys.SK);
  },

  // Create a registration item using the new REGISTRATION schema
  createRegistrationItem: async (input: {
    registrationId: string;
    userId: string;
    eventId: string;
    email: string;
    registeredAt: string;
    ticketCode: string;
    ticketId?: string;
    requestId?: string;
    status?: string;
    paymentState?: string;
  }): Promise<any> => {
    const keys = buildRegistrationKeys(input.userId, input.eventId);
    const now = new Date().toISOString();

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'REGISTRATION',
      registrationId: input.registrationId,
      userId: input.userId,
      eventId: input.eventId,
      email: input.email,
      registeredAt: input.registeredAt,
      ticketCode: input.ticketCode,
      ticketId: input.ticketId || input.ticketCode,
      requestId: input.requestId || input.registrationId,
      status: input.status || 'REGISTERED',
      paymentState: input.paymentState || 'FREE',
      GSI2PK: keys.GSI2PK,
      GSI2SK: keys.GSI2SK,
      createdAt: now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Decrement remaining seats while keeping compatibility counters updated
  decrementRemainingSeats: async (eventId: string): Promise<any | null> => {
    const keys = buildEventKeys(eventId);
    logger.info(`dbService.decrementRemainingSeats: eventId=${eventId}`);

    const existingItem = await dbService.getItem(keys.PK, keys.SK);
    if (!existingItem) {
      return null;
    }

    const totalSeats = Number(existingItem.totalSeats || 0);
    const currentRegisteredCount = calculateRegisteredCount(existingItem);
    const currentRemainingSeats =
      existingItem.remainingSeats !== undefined
        ? Number(existingItem.remainingSeats || 0)
        : Math.max(0, totalSeats - currentRegisteredCount);
    const nextRemainingSeats = Math.max(0, currentRemainingSeats - 1);
    const nextRegisteredCount = Math.max(0, totalSeats - nextRemainingSeats);

    const updatedItem = {
      ...existingItem,
      remainingSeats: nextRemainingSeats,
      registeredCount: nextRegisteredCount,
      updatedAt: new Date().toISOString()
    };

    await dbService.putItem(updatedItem);
    return updatedItem;
  },

  // List registrations for an event using the new GSI2 access pattern, with mock fallback for legacy data
  listRegistrationsByEventGSI2: async (eventId: string): Promise<any[]> => {
    logger.info(`dbService.listRegistrationsByEventGSI2: eventId=${eventId}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const gsiEventPk = `EVENT#${eventId}`;

      const newSchemaRegistrations = items.filter(
        item =>
          item.GSI2PK === gsiEventPk &&
          typeof item.GSI2SK === 'string' &&
          item.GSI2SK.startsWith('USER#')
      );

      const legacyRegistrations = items.filter(
        item =>
          item.PK === gsiEventPk &&
          typeof item.SK === 'string' &&
          item.SK.startsWith('USER#')
      );

      const registrationMap = new Map<string, any>();
      for (const item of legacyRegistrations) {
        const key = item.registrationId || `${extractUserIdFromRegistration(item)}#${extractEventIdFromRegistration(item)}`;
        registrationMap.set(key, item);
      }
      for (const item of newSchemaRegistrations) {
        const key = item.registrationId || `${extractUserIdFromRegistration(item)}#${extractEventIdFromRegistration(item)}`;
        registrationMap.set(key, item);
      }

      return Array.from(registrationMap.values());
    } else {
      const result = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2Index',
        KeyConditionExpression: 'GSI2PK = :gsiPk AND begins_with(GSI2SK, :gsiSkPrefix)',
        ExpressionAttributeValues: {
          ':gsiPk': `EVENT#${eventId}`,
          ':gsiSkPrefix': 'USER#'
        }
      }));

      return result.Items || [];
    }
  },

  // Delete a registration stored by the new REGISTRATION primary key
  deleteRegistration: async (userId: string, eventId: string): Promise<void> => {
    const keys = buildRegistrationKeys(userId, eventId);
    logger.info(`dbService.deleteRegistration: userId=${userId}, eventId=${eventId}`);

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const remaining = items.filter(item => !(item.PK === keys.PK && item.SK === keys.SK));
      writeMockDb(remaining);
    } else {
      await ddbDocClient!.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: keys.PK, SK: keys.SK }
      }));
    }
  },

  // Delete an event and all related registrations across new and legacy schemas
  deleteEventCascade: async (eventId: string): Promise<void> => {
    logger.info(`dbService.deleteEventCascade: eventId=${eventId}`);
    const eventKeys = buildEventKeys(eventId);

    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    for (const registration of registrations) {
      const userId = extractUserIdFromRegistration(registration);
      const registrationEventId = extractEventIdFromRegistration(registration) || eventId;

      if (userId) {
        await dbService.deleteRegistration(userId, registrationEventId);
      }
    }

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const remaining = items.filter(item => {
        if (item.PK === eventKeys.PK) {
          return false;
        }

        if (item.GSI2PK === eventKeys.PK) {
          return false;
        }

        if (item.PK === eventKeys.PK && item.SK === eventKeys.SK) {
          return false;
        }

        return true;
      });

      writeMockDb(remaining);
    } else {
      const legacyPartitionItems = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': eventKeys.PK
        }
      }));

      const itemsToDelete = legacyPartitionItems.Items || [];
      for (const item of itemsToDelete) {
        await ddbDocClient!.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: eventKeys.PK, SK: item.SK }
        }));
      }

      const eventItem = itemsToDelete.find(item => item.SK === eventKeys.SK);
      if (!eventItem) {
        const existingEvent = await dbService.getItem(eventKeys.PK, eventKeys.SK);
        if (existingEvent) {
          await ddbDocClient!.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: eventKeys.PK, SK: eventKeys.SK }
          }));
        }
      }
    }
  },

  // Query the user partition to get all events registered by user
  getUserRegistrations: async (userId: string): Promise<any[]> => {
    logger.info(`dbService.getUserRegistrations: userId=${userId}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const userPk = `USER#${userId}`;
      const legacySk = `USER#${userId}`;

      let registrations = items.filter(
        item => item.PK === userPk && typeof item.SK === 'string' && item.SK.startsWith('EVENT#')
      );

      if (registrations.length === 0) {
        registrations = items.filter(
          item => item.SK === legacySk && typeof item.PK === 'string' && item.PK.startsWith('EVENT#')
        );
      }

      const enriched = registrations.map(reg => {
        const eventId = extractEventIdFromRegistration(reg);
        if (!eventId) {
          return mapRegistrationItemToDto(reg, null);
        }

        const eventKeys = buildEventKeys(eventId);
        const eventMeta = items.find(
          item => item.PK === eventKeys.PK && item.SK === eventKeys.SK
        );

        return mapRegistrationItemToDto(reg, eventMeta || null);
      });

      return enriched;
    } else {
      const result = await ddbDocClient!.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':skPrefix': 'EVENT#'
        }
      }));
      const registrations = result.Items || [];

      // Hydrate event metadata
      const enriched = [];
      for (const reg of registrations) {
        const eventId = extractEventIdFromRegistration(reg);
        const eventKeys = buildEventKeys(eventId);
        const eventItem = eventId
          ? await dbService.getItem(eventKeys.PK, eventKeys.SK)
          : null;

        enriched.push(mapRegistrationItemToDto(reg, eventItem));
      }
      return enriched;
    }
  }
};
