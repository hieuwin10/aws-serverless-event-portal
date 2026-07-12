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

const DEFAULT_ORGANIZER_ID = 'aws-vietnam';

const DEFAULT_ORGANIZERS = [
  {
    organizerId: 'aws-vietnam',
    name: 'AWS Vietnam',
    email: 'aws-vietnam@example.com',
    description: 'AWS community events in Vietnam'
  },
  {
    organizerId: 'hutech',
    name: 'HUTECH',
    email: 'events@hutech.edu.vn',
    description: 'HUTECH campus event organizer'
  },
  {
    organizerId: 'tech-community',
    name: 'Tech Community',
    email: 'hello@techcommunity.vn',
    description: 'Vietnam technology community events'
  }
];

const DEFAULT_SPEAKERS = [
  {
    speakerId: 'speaker-aws',
    fullName: 'AWS Solutions Architect',
    title: 'Solutions Architect',
    company: 'AWS Vietnam',
    bio: 'Cloud practitioner sharing serverless architecture and cost optimization experience.',
    avatarUrl: ''
  },
  {
    speakerId: 'speaker-hutech',
    fullName: 'HUTECH Lecturer',
    title: 'Lecturer',
    company: 'HUTECH',
    bio: 'Educator focused on practical software engineering and cloud adoption.',
    avatarUrl: ''
  },
  {
    speakerId: 'speaker-community',
    fullName: 'Community Speaker',
    title: 'Community Lead',
    company: 'Tech Community',
    bio: 'Community builder hosting talks and workshops for local developers.',
    avatarUrl: ''
  }
];

const DEFAULT_SPONSORS = [
  {
    sponsorId: 'aws',
    sponsorName: 'AWS',
    website: 'https://aws.amazon.com',
    tier: 'Platinum'
  },
  {
    sponsorId: 'hutech',
    sponsorName: 'HUTECH',
    website: 'https://www.hutech.edu.vn',
    tier: 'Gold'
  },
  {
    sponsorId: 'tech-community',
    sponsorName: 'Tech Community',
    website: 'https://techcommunity.vn',
    tier: 'Community'
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
    remainingQuantity: 499,
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
    PK: 'ORG#aws-vietnam',
    SK: 'METADATA',
    entityType: 'ORGANIZER',
    organizerId: 'aws-vietnam',
    name: 'AWS Vietnam',
    email: 'aws-vietnam@example.com',
    description: 'AWS community events in Vietnam',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'ORG#hutech',
    SK: 'METADATA',
    entityType: 'ORGANIZER',
    organizerId: 'hutech',
    name: 'HUTECH',
    email: 'events@hutech.edu.vn',
    description: 'HUTECH campus event organizer',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'ORG#tech-community',
    SK: 'METADATA',
    entityType: 'ORGANIZER',
    organizerId: 'tech-community',
    name: 'Tech Community',
    email: 'hello@techcommunity.vn',
    description: 'Vietnam technology community events',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'SPEAKER#speaker-aws',
    SK: 'METADATA',
    entityType: 'SPEAKER',
    speakerId: 'speaker-aws',
    fullName: 'AWS Solutions Architect',
    title: 'Solutions Architect',
    company: 'AWS Vietnam',
    bio: 'Cloud practitioner sharing serverless architecture and cost optimization experience.',
    avatarUrl: '',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'SPEAKER#speaker-hutech',
    SK: 'METADATA',
    entityType: 'SPEAKER',
    speakerId: 'speaker-hutech',
    fullName: 'HUTECH Lecturer',
    title: 'Lecturer',
    company: 'HUTECH',
    bio: 'Educator focused on practical software engineering and cloud adoption.',
    avatarUrl: '',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'SPEAKER#speaker-community',
    SK: 'METADATA',
    entityType: 'SPEAKER',
    speakerId: 'speaker-community',
    fullName: 'Community Speaker',
    title: 'Community Lead',
    company: 'Tech Community',
    bio: 'Community builder hosting talks and workshops for local developers.',
    avatarUrl: '',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'SPONSOR#aws',
    SK: 'METADATA',
    entityType: 'SPONSOR',
    sponsorId: 'aws',
    sponsorName: 'AWS',
    website: 'https://aws.amazon.com',
    tier: 'Platinum',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'SPONSOR#hutech',
    SK: 'METADATA',
    entityType: 'SPONSOR',
    sponsorId: 'hutech',
    sponsorName: 'HUTECH',
    website: 'https://www.hutech.edu.vn',
    tier: 'Gold',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'SPONSOR#tech-community',
    SK: 'METADATA',
    entityType: 'SPONSOR',
    sponsorId: 'tech-community',
    sponsorName: 'Tech Community',
    website: 'https://techcommunity.vn',
    tier: 'Community',
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
    title: 'Hội Thảo AWS Serverless Đột Phá 2026',
    description: 'Chia sẻ kinh nghiệm thực tế về tối ưu hóa chi phí và xây dựng ứng dụng không máy chủ trên AWS.',
    startTime: '2026-06-15T09:00:00Z',
    endTime: '2026-06-15T12:00:00Z',
    remainingSeats: 499,
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
    location: 'Trực tuyến (Zoom)',
    registeredCount: 1
  },
  {
    PK: 'EVENT#evt_education_2026',
    SK: 'TICKET#GENERAL',
    entityType: 'TICKET',
    ticketId: 'GENERAL',
    eventId: 'evt_education_2026',
    ticketName: 'General Admission',
    price: 0,
    currency: 'VND',
    totalQuantity: 100,
    remainingQuantity: 100,
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'EVENT#evt_education_2026',
    SK: 'METADATA',
    entityType: 'EVENT',
    eventId: 'evt_education_2026',
    organizerId: 'usr_admin_9999_9999_9999_9999',
    categoryId: 'education',
    locationId: 'online',
    title: 'Khóa học AI/ML cho người mới bắt đầu 2026',
    description: 'Tìm hiểu các khái niệm cơ bản về Trí tuệ nhân tạo và Học máy thông qua bài tập thực hành.',
    startTime: '2026-07-20T09:00:00Z',
    endTime: '2026-07-20T12:00:00Z',
    remainingSeats: 100,
    totalSeats: 100,
    status: 'PUBLISHED',
    GSI1PK: 'CAT#education',
    GSI1SK: 'START#2026-07-20T09:00:00Z#EVENT#evt_education_2026',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
    id: 'evt_education_2026',
    category: 'education',
    date: '2026-07-20T09:00:00Z',
    location: 'Trực tuyến (Zoom)',
    registeredCount: 0
  },
  {
    PK: 'EVENT#evt_music_2026',
    SK: 'TICKET#GENERAL',
    entityType: 'TICKET',
    ticketId: 'GENERAL',
    eventId: 'evt_music_2026',
    ticketName: 'General Admission',
    price: 0,
    currency: 'VND',
    totalQuantity: 300,
    remainingQuantity: 300,
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z'
  },
  {
    PK: 'EVENT#evt_music_2026',
    SK: 'METADATA',
    entityType: 'EVENT',
    eventId: 'evt_music_2026',
    organizerId: 'usr_admin_9999_9999_9999_9999',
    categoryId: 'music',
    locationId: 'hcm',
    title: 'Lễ hội Âm nhạc AWS Community 2026',
    description: 'Gặp gỡ giao lưu và tận hưởng những giai điệu âm nhạc tuyệt vời cùng cộng đồng công nghệ AWS.',
    startTime: '2026-08-15T18:00:00Z',
    endTime: '2026-08-15T22:00:00Z',
    remainingSeats: 300,
    totalSeats: 300,
    status: 'PUBLISHED',
    GSI1PK: 'CAT#music',
    GSI1SK: 'START#2026-08-15T18:00:00Z#EVENT#evt_music_2026',
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063',
    id: 'evt_music_2026',
    category: 'music',
    date: '2026-08-15T18:00:00Z',
    location: 'Hồ Chí Minh Campus',
    registeredCount: 0
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

export const buildCheckinKeys = (eventId: string, userId: string) => ({
  PK: `EVENT#${eventId}`,
  SK: `CHECKIN#${userId}`
});

export const buildFeedbackKeys = (eventId: string, userId: string) => ({
  PK: `EVENT#${eventId}`,
  SK: `FEEDBACK#${userId}`
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

export const buildOrganizerKeys = (organizerId: string) => ({
  PK: `ORG#${normalizeCategory(organizerId)}`,
  SK: 'METADATA'
});

export const buildSpeakerKeys = (speakerId: string) => ({
  PK: `SPEAKER#${normalizeCategory(speakerId)}`,
  SK: 'METADATA'
});

export const buildSponsorKeys = (sponsorId: string) => ({
  PK: `SPONSOR#${normalizeCategory(sponsorId)}`,
  SK: 'METADATA'
});

export const buildEventSpeakerKeys = (eventId: string, speakerId: string) => ({
  PK: `EVENT#${eventId}`,
  SK: `SPEAKER#${normalizeCategory(speakerId)}`
});

export const buildEventSponsorKeys = (eventId: string, sponsorId: string) => ({
  PK: `EVENT#${eventId}`,
  SK: `SPONSOR#${normalizeCategory(sponsorId)}`
});

export const buildRegistrationKeys = (userId: string, eventId: string) => ({
  PK: `USER#${userId}`,
  SK: `EVENT#${eventId}`,
  GSI2PK: `EVENT#${eventId}`,
  GSI2SK: `USER#${userId}`
});

export const buildPaymentKeys = (registrationId: string, paymentId: string) => ({
  PK: `REG#${registrationId}`,
  SK: `PAYMENT#${paymentId}`
});

export const buildNotificationKeys = (userId: string, notificationId: string) => ({
  PK: `USER#${userId}`,
  SK: `NOTIFICATION#${notificationId}`
});

export const buildMaterializedViewKeys = (viewName: string) => ({
  PK: `VIEW#${viewName}`,
  SK: 'METADATA'
});

export const buildAuditLogKeys = (createdAt: string, auditId: string) => {
  const date = createdAt.slice(0, 10);
  return {
    PK: `AUDIT#${date}`,
    SK: `LOG#${createdAt}#${auditId}`
  };
};

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

export const mapCheckinItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  return {
    eventId: item.eventId || '',
    userId: item.userId || '',
    registrationId: item.registrationId || '',
    ticketId: item.ticketId || '',
    checkedInAt: item.checkedInAt || '',
    checkedInBy: item.checkedInBy || ''
  };
};

export const mapFeedbackItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  return {
    feedbackId: item.feedbackId || '',
    eventId: item.eventId || '',
    userId: item.userId || '',
    rating: Number(item.rating || 0),
    comment: item.comment || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || item.createdAt || ''
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
    role: item.role || 'User',
    loyaltyPoints: item.loyaltyPoints !== undefined ? Number(item.loyaltyPoints || 0) : 0
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

export const mapOrganizerItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  const organizerIdFromPk =
    typeof item.PK === 'string' && item.PK.startsWith('ORG#')
      ? item.PK.slice('ORG#'.length)
      : '';

  return {
    id: normalizeCategory(item.organizerId || organizerIdFromPk),
    organizerId: normalizeCategory(item.organizerId || organizerIdFromPk),
    name: item.name || item.organizerName || '',
    email: item.email || item.contactEmail || '',
    description: item.description || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || item.createdAt || ''
  };
};

export const mapSpeakerItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  const speakerIdFromPk =
    typeof item.PK === 'string' && item.PK.startsWith('SPEAKER#')
      ? item.PK.slice('SPEAKER#'.length)
      : '';

  return {
    id: normalizeCategory(item.speakerId || speakerIdFromPk),
    speakerId: normalizeCategory(item.speakerId || speakerIdFromPk),
    fullName: item.fullName || '',
    title: item.title || '',
    company: item.company || '',
    bio: item.bio || '',
    avatarUrl: item.avatarUrl || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || item.createdAt || ''
  };
};

export const mapSponsorItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  const sponsorIdFromPk =
    typeof item.PK === 'string' && item.PK.startsWith('SPONSOR#')
      ? item.PK.slice('SPONSOR#'.length)
      : '';

  return {
    id: normalizeCategory(item.sponsorId || sponsorIdFromPk),
    sponsorId: normalizeCategory(item.sponsorId || sponsorIdFromPk),
    sponsorName: item.sponsorName || item.name || '',
    website: item.website || '',
    tier: item.tier || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || item.createdAt || ''
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
    checkedIn: Boolean(item.checkedIn),
    checkedInAt: item.checkedInAt || '',
    checkedInBy: item.checkedInBy || '',
    checkedOut: Boolean(item.checkedOut),
    checkedOutAt: item.checkedOutAt || '',
    checkedOutBy: item.checkedOutBy || '',
    manualOverride: Boolean(item.manualOverride),
    event: mappedEvent
  };
};

export const mapPaymentItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  return {
    paymentId: item.paymentId || '',
    registrationId: item.registrationId || '',
    userId: item.userId || '',
    eventId: item.eventId || '',
    amount: Number(item.amount || 0),
    currency: item.currency || 'VND',
    provider: item.provider || 'MOCK',
    state: item.state || 'SUCCESS',
    transactionId: item.transactionId || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || item.createdAt || ''
  };
};

export const mapAuditLogItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  return {
    auditId: item.auditId || '',
    action: item.action || '',
    actorId: item.actorId || '',
    actorEmail: item.actorEmail || '',
    resourceType: item.resourceType || '',
    resourceId: item.resourceId || '',
    details: item.details || {},
    createdAt: item.createdAt || ''
  };
};

export const mapNotificationItemToDto = (item: any): any | null => {
  if (!item) {
    return null;
  }

  return {
    notificationId: item.notificationId || '',
    userId: item.userId || '',
    title: item.title || '',
    message: item.message || item.content || '',
    type: item.type || 'INFO',
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || item.createdAt || '',
    ttl: Number(item.ttl || 0)
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

  // Create an audit log item using the AUDIT_LOG schema
  createAuditLog: async (input: {
    auditId?: string;
    action: string;
    actorId?: string;
    actorEmail?: string;
    resourceType: string;
    resourceId: string;
    details?: any;
    createdAt?: string;
  }): Promise<any> => {
    const createdAt = input.createdAt || new Date().toISOString();
    const auditId =
      input.auditId ||
      `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const keys = buildAuditLogKeys(createdAt, auditId);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'AUDIT_LOG',
      auditId,
      action: input.action,
      actorId: input.actorId || '',
      actorEmail: input.actorEmail || '',
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      details: input.details || {},
      createdAt
    };

    await dbService.putItem(item);
    return item;
  },

  // List newest audit logs across all dates
  listAuditLogs: async (): Promise<any[]> => {
    logger.info('dbService.listAuditLogs');

    const items = DB_MODE === 'mock'
      ? readMockDb().filter(item => item.entityType === 'AUDIT_LOG')
      : (await ddbDocClient!.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'entityType = :auditType',
          ExpressionAttributeValues: {
            ':auditType': 'AUDIT_LOG'
          }
        }))).Items || [];

    return items
      .map(item => mapAuditLogItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.auditId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // List audit logs for a specific YYYY-MM-DD date
  listAuditLogsByDate: async (date: string): Promise<any[]> => {
    logger.info(`dbService.listAuditLogsByDate: date=${date}`);
    const auditPk = `AUDIT#${date}`;

    const items = DB_MODE === 'mock'
      ? readMockDb().filter(
          item =>
            item.PK === auditPk &&
            typeof item.SK === 'string' &&
            item.SK.startsWith('LOG#') &&
            item.entityType === 'AUDIT_LOG'
        )
      : (await ddbDocClient!.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': auditPk,
            ':skPrefix': 'LOG#'
          }
        }))).Items || [];

    return items
      .map(item => mapAuditLogItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.auditId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Create a notification item using the NOTIFICATION schema
  createNotificationItem: async (input: {
    notificationId?: string;
    userId: string;
    title: string;
    message: string;
    type?: string;
    isRead?: boolean;
    ttl?: number;
  }): Promise<any> => {
    const now = new Date().toISOString();
    const notificationId =
      input.notificationId ||
      `notif_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const keys = buildNotificationKeys(input.userId, notificationId);
    const defaultTtl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'NOTIFICATION',
      notificationId,
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || 'INFO',
      isRead: input.isRead ?? false,
      createdAt: now,
      updatedAt: now,
      ttl: input.ttl || defaultTtl
    };

    await dbService.putItem(item);
    return item;
  },

  // List notifications for a user
  listNotificationsByUser: async (userId: string): Promise<any[]> => {
    logger.info(`dbService.listNotificationsByUser: userId=${userId}`);
    const userPk = `USER#${userId}`;

    const items = DB_MODE === 'mock'
      ? readMockDb().filter(
          item =>
            item.PK === userPk &&
            typeof item.SK === 'string' &&
            item.SK.startsWith('NOTIFICATION#') &&
            item.entityType === 'NOTIFICATION'
        )
      : (await ddbDocClient!.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': userPk,
            ':skPrefix': 'NOTIFICATION#'
          }
        }))).Items || [];

    return items
      .map(item => mapNotificationItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.notificationId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Mark a notification as read
  markNotificationAsRead: async (userId: string, notificationId: string): Promise<any | null> => {
    logger.info(`dbService.markNotificationAsRead: userId=${userId}, notificationId=${notificationId}`);
    const keys = buildNotificationKeys(userId, notificationId);
    const item = await dbService.getItem(keys.PK, keys.SK);

    if (!item || (item.entityType && item.entityType !== 'NOTIFICATION')) {
      return null;
    }

    const updatedItem = {
      ...item,
      isRead: true,
      updatedAt: new Date().toISOString()
    };

    await dbService.putItem(updatedItem);
    return mapNotificationItemToDto(updatedItem);
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

  // Create a checkin item using the CHECKIN schema
  createCheckinItem: async (input: {
    eventId: string;
    userId: string;
    registrationId: string;
    ticketId: string;
    checkedInBy: string;
    checkedInAt?: string;
  }): Promise<any> => {
    const now = new Date().toISOString();
    const keys = buildCheckinKeys(input.eventId, input.userId);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'CHECKIN',
      eventId: input.eventId,
      userId: input.userId,
      registrationId: input.registrationId,
      ticketId: input.ticketId,
      checkedInAt: input.checkedInAt || now,
      checkedInBy: input.checkedInBy,
      createdAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Get a checkin by eventId and userId
  getCheckin: async (eventId: string, userId: string): Promise<any | null> => {
    const keys = buildCheckinKeys(eventId, userId);
    logger.info(`dbService.getCheckin: eventId=${eventId}, userId=${userId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'CHECKIN') {
      return null;
    }

    return mapCheckinItemToDto(item);
  },

  // List checkins for an event
  listCheckinsByEvent: async (eventId: string): Promise<any[]> => {
    logger.info(`dbService.listCheckinsByEvent: eventId=${eventId}`);
    const eventPk = `EVENT#${eventId}`;

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      return items
        .filter(
          item =>
            item.PK === eventPk &&
            typeof item.SK === 'string' &&
            item.SK.startsWith('CHECKIN#') &&
            item.entityType === 'CHECKIN'
        )
        .map(item => mapCheckinItemToDto(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }

    const result = await ddbDocClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': eventPk,
        ':skPrefix': 'CHECKIN#'
      }
    }));

    return (result.Items || [])
      .filter((item: any) => item.entityType === 'CHECKIN')
      .map((item: any) => mapCheckinItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);
  },

  // Create or update a feedback item using the FEEDBACK schema
  createFeedbackItem: async (input: {
    feedbackId?: string;
    eventId: string;
    userId: string;
    rating: number;
    comment?: string;
  }): Promise<any> => {
    const now = new Date().toISOString();
    const keys = buildFeedbackKeys(input.eventId, input.userId);
    const existingFeedback = await dbService.getItem(keys.PK, keys.SK);
    const existingCreatedAt =
      existingFeedback?.entityType === 'FEEDBACK'
        ? existingFeedback.createdAt
        : undefined;

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'FEEDBACK',
      feedbackId:
        existingFeedback?.entityType === 'FEEDBACK'
          ? existingFeedback.feedbackId
          : input.feedbackId || `fb_${input.eventId}_${input.userId}`,
      eventId: input.eventId,
      userId: input.userId,
      rating: input.rating,
      comment: input.comment || '',
      createdAt: existingCreatedAt || now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Get a feedback item by eventId and userId
  getFeedbackByUser: async (eventId: string, userId: string): Promise<any | null> => {
    const keys = buildFeedbackKeys(eventId, userId);
    logger.info(`dbService.getFeedbackByUser: eventId=${eventId}, userId=${userId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'FEEDBACK') {
      return null;
    }

    return mapFeedbackItemToDto(item);
  },

  // List feedback entries for an event
  listFeedbacksByEvent: async (eventId: string): Promise<any[]> => {
    logger.info(`dbService.listFeedbacksByEvent: eventId=${eventId}`);
    const eventPk = `EVENT#${eventId}`;

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      return items
        .filter(
          item =>
            item.PK === eventPk &&
            typeof item.SK === 'string' &&
            item.SK.startsWith('FEEDBACK#') &&
            item.entityType === 'FEEDBACK'
        )
        .map(item => mapFeedbackItemToDto(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }

    const result = await ddbDocClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': eventPk,
        ':skPrefix': 'FEEDBACK#'
      }
    }));

    return (result.Items || [])
      .filter((item: any) => item.entityType === 'FEEDBACK')
      .map((item: any) => mapFeedbackItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);
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
      loyaltyPoints: existingUser?.loyaltyPoints !== undefined ? Number(existingUser.loyaltyPoints) : 0,
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

  // List organizers and seed the default ORGANIZER items when they are missing
  listOrganizers: async (): Promise<any[]> => {
    logger.info('dbService.listOrganizers');

    const getOrganizerItems = async (): Promise<any[]> => {
      if (DB_MODE === 'mock') {
        const items = readMockDb();
        return items.filter(item => item.entityType === 'ORGANIZER');
      }

      const result = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :organizerType AND SK = :sk',
        ExpressionAttributeValues: {
          ':organizerType': 'ORGANIZER',
          ':sk': 'METADATA'
        }
      }));

      return result.Items || [];
    };

    const organizerItems = await getOrganizerItems();
    const organizerMap = new Map<string, any>();
    for (const item of organizerItems) {
      const organizerId = normalizeCategory(item.organizerId || item.PK?.replace('ORG#', ''));
      if (organizerId) {
        organizerMap.set(organizerId, item);
      }
    }

    for (const organizer of DEFAULT_ORGANIZERS) {
      if (!organizerMap.has(organizer.organizerId)) {
        const createdOrganizer = await dbService.createOrganizerItem(organizer);
        organizerMap.set(organizer.organizerId, createdOrganizer);
      }
    }

    const defaultOrganizerOrder = new Map(
      DEFAULT_ORGANIZERS.map((organizer, index) => [organizer.organizerId, index])
    );

    return Array.from(organizerMap.values())
      .map(item => mapOrganizerItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.id))
      .sort((a, b) => {
        const orderA = defaultOrganizerOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = defaultOrganizerOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name);
      });
  },

  // Get organizer metadata by organizerId
  getOrganizerById: async (organizerId: string): Promise<any | null> => {
    const normalizedOrganizerId = normalizeCategory(organizerId);
    const keys = buildOrganizerKeys(normalizedOrganizerId);
    logger.info(`dbService.getOrganizerById: organizerId=${normalizedOrganizerId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'ORGANIZER') {
      return null;
    }

    return mapOrganizerItemToDto(item);
  },

  // Create an organizer item using the ORGANIZER schema
  createOrganizerItem: async (input: {
    organizerId: string;
    name: string;
    email: string;
    description?: string;
  }): Promise<any> => {
    const organizerId = normalizeCategory(input.organizerId);
    const now = new Date().toISOString();
    const keys = buildOrganizerKeys(organizerId);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'ORGANIZER',
      organizerId,
      name: input.name,
      email: input.email,
      description: input.description || '',
      createdAt: now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // List speakers and seed the default SPEAKER items when they are missing
  listSpeakers: async (): Promise<any[]> => {
    logger.info('dbService.listSpeakers');

    const getSpeakerItems = async (): Promise<any[]> => {
      if (DB_MODE === 'mock') {
        const items = readMockDb();
        return items.filter(item => item.entityType === 'SPEAKER');
      }

      const result = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :speakerType AND SK = :sk',
        ExpressionAttributeValues: {
          ':speakerType': 'SPEAKER',
          ':sk': 'METADATA'
        }
      }));

      return result.Items || [];
    };

    const speakerItems = await getSpeakerItems();
    const speakerMap = new Map<string, any>();
    for (const item of speakerItems) {
      const speakerId = normalizeCategory(item.speakerId || item.PK?.replace('SPEAKER#', ''));
      if (speakerId) {
        speakerMap.set(speakerId, item);
      }
    }

    for (const speaker of DEFAULT_SPEAKERS) {
      if (!speakerMap.has(speaker.speakerId)) {
        const createdSpeaker = await dbService.createSpeakerItem(speaker);
        speakerMap.set(speaker.speakerId, createdSpeaker);
      }
    }

    const defaultSpeakerOrder = new Map(
      DEFAULT_SPEAKERS.map((speaker, index) => [speaker.speakerId, index])
    );

    return Array.from(speakerMap.values())
      .map(item => mapSpeakerItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.id))
      .sort((a, b) => {
        const orderA = defaultSpeakerOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = defaultSpeakerOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.fullName.localeCompare(b.fullName);
      });
  },

  // Get speaker metadata by speakerId
  getSpeakerById: async (speakerId: string): Promise<any | null> => {
    const normalizedSpeakerId = normalizeCategory(speakerId);
    const keys = buildSpeakerKeys(normalizedSpeakerId);
    logger.info(`dbService.getSpeakerById: speakerId=${normalizedSpeakerId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'SPEAKER') {
      return null;
    }

    return mapSpeakerItemToDto(item);
  },

  // Create a speaker item using the SPEAKER schema
  createSpeakerItem: async (input: {
    speakerId: string;
    fullName: string;
    title?: string;
    company?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<any> => {
    const speakerId = normalizeCategory(input.speakerId);
    const now = new Date().toISOString();
    const keys = buildSpeakerKeys(speakerId);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'SPEAKER',
      speakerId,
      fullName: input.fullName,
      title: input.title || '',
      company: input.company || '',
      bio: input.bio || '',
      avatarUrl: input.avatarUrl || '',
      createdAt: now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // List sponsors and seed the default SPONSOR items when they are missing
  listSponsors: async (): Promise<any[]> => {
    logger.info('dbService.listSponsors');

    const getSponsorItems = async (): Promise<any[]> => {
      if (DB_MODE === 'mock') {
        const items = readMockDb();
        return items.filter(item => item.entityType === 'SPONSOR');
      }

      const result = await ddbDocClient!.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :sponsorType AND SK = :sk',
        ExpressionAttributeValues: {
          ':sponsorType': 'SPONSOR',
          ':sk': 'METADATA'
        }
      }));

      return result.Items || [];
    };

    const sponsorItems = await getSponsorItems();
    const sponsorMap = new Map<string, any>();
    for (const item of sponsorItems) {
      const sponsorId = normalizeCategory(item.sponsorId || item.PK?.replace('SPONSOR#', ''));
      if (sponsorId) {
        sponsorMap.set(sponsorId, item);
      }
    }

    for (const sponsor of DEFAULT_SPONSORS) {
      if (!sponsorMap.has(sponsor.sponsorId)) {
        const createdSponsor = await dbService.createSponsorItem(sponsor);
        sponsorMap.set(sponsor.sponsorId, createdSponsor);
      }
    }

    const defaultSponsorOrder = new Map(
      DEFAULT_SPONSORS.map((sponsor, index) => [sponsor.sponsorId, index])
    );

    return Array.from(sponsorMap.values())
      .map(item => mapSponsorItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.id))
      .sort((a, b) => {
        const orderA = defaultSponsorOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = defaultSponsorOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.sponsorName.localeCompare(b.sponsorName);
      });
  },

  // Get sponsor metadata by sponsorId
  getSponsorById: async (sponsorId: string): Promise<any | null> => {
    const normalizedSponsorId = normalizeCategory(sponsorId);
    const keys = buildSponsorKeys(normalizedSponsorId);
    logger.info(`dbService.getSponsorById: sponsorId=${normalizedSponsorId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'SPONSOR') {
      return null;
    }

    return mapSponsorItemToDto(item);
  },

  // Create a sponsor item using the SPONSOR schema
  createSponsorItem: async (input: {
    sponsorId: string;
    sponsorName: string;
    website?: string;
    tier?: string;
  }): Promise<any> => {
    const sponsorId = normalizeCategory(input.sponsorId);
    const now = new Date().toISOString();
    const keys = buildSponsorKeys(sponsorId);

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'SPONSOR',
      sponsorId,
      sponsorName: input.sponsorName,
      website: input.website || '',
      tier: input.tier || '',
      createdAt: now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Link a speaker to an event using the EVENT_SPEAKER relationship schema
  linkSpeakerToEvent: async (eventId: string, speakerId: string): Promise<any> => {
    const normalizedSpeakerId = normalizeCategory(speakerId);
    const keys = buildEventSpeakerKeys(eventId, normalizedSpeakerId);
    logger.info(`dbService.linkSpeakerToEvent: eventId=${eventId}, speakerId=${normalizedSpeakerId}`);

    const existingRelationship = await dbService.getItem(keys.PK, keys.SK);
    if (existingRelationship?.entityType === 'EVENT_SPEAKER') {
      return existingRelationship;
    }

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'EVENT_SPEAKER',
      eventId,
      speakerId: normalizedSpeakerId,
      createdAt: new Date().toISOString()
    };

    await dbService.putItem(item);
    return item;
  },

  // Remove a speaker-event relationship
  unlinkSpeakerFromEvent: async (eventId: string, speakerId: string): Promise<void> => {
    const normalizedSpeakerId = normalizeCategory(speakerId);
    const keys = buildEventSpeakerKeys(eventId, normalizedSpeakerId);
    logger.info(`dbService.unlinkSpeakerFromEvent: eventId=${eventId}, speakerId=${normalizedSpeakerId}`);

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const remaining = items.filter(item => !(item.PK === keys.PK && item.SK === keys.SK));
      writeMockDb(remaining);
      return;
    }

    await ddbDocClient!.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: keys.PK, SK: keys.SK }
    }));
  },

  // List speaker metadata linked to an event
  listSpeakersByEvent: async (eventId: string): Promise<any[]> => {
    logger.info(`dbService.listSpeakersByEvent: eventId=${eventId}`);
    const eventPk = `EVENT#${eventId}`;

    const relationshipItems = DB_MODE === 'mock'
      ? readMockDb().filter(
          item =>
            item.PK === eventPk &&
            typeof item.SK === 'string' &&
            item.SK.startsWith('SPEAKER#') &&
            item.entityType === 'EVENT_SPEAKER'
        )
      : (await ddbDocClient!.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': eventPk,
            ':skPrefix': 'SPEAKER#'
          }
        }))).Items || [];

    const speakers = [];
    for (const relationship of relationshipItems) {
      if (relationship.entityType !== 'EVENT_SPEAKER') {
        continue;
      }

      const speakerId = relationship.speakerId || relationship.SK?.replace('SPEAKER#', '');
      if (!speakerId) {
        continue;
      }

      const speaker = await dbService.getSpeakerById(speakerId);
      if (speaker) {
        speakers.push(speaker);
      }
    }

    return speakers;
  },

  // Link a sponsor to an event using the EVENT_SPONSOR relationship schema
  linkSponsorToEvent: async (eventId: string, sponsorId: string, tier?: string): Promise<any> => {
    const normalizedSponsorId = normalizeCategory(sponsorId);
    const keys = buildEventSponsorKeys(eventId, normalizedSponsorId);
    logger.info(`dbService.linkSponsorToEvent: eventId=${eventId}, sponsorId=${normalizedSponsorId}`);

    const existingRelationship = await dbService.getItem(keys.PK, keys.SK);
    if (existingRelationship?.entityType === 'EVENT_SPONSOR' && tier === undefined) {
      return existingRelationship;
    }

    const now = new Date().toISOString();
    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'EVENT_SPONSOR',
      eventId,
      sponsorId: normalizedSponsorId,
      tier: tier !== undefined ? tier : existingRelationship?.tier || '',
      createdAt:
        existingRelationship?.entityType === 'EVENT_SPONSOR'
          ? existingRelationship.createdAt
          : now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Remove a sponsor-event relationship
  unlinkSponsorFromEvent: async (eventId: string, sponsorId: string): Promise<void> => {
    const normalizedSponsorId = normalizeCategory(sponsorId);
    const keys = buildEventSponsorKeys(eventId, normalizedSponsorId);
    logger.info(`dbService.unlinkSponsorFromEvent: eventId=${eventId}, sponsorId=${normalizedSponsorId}`);

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const remaining = items.filter(item => !(item.PK === keys.PK && item.SK === keys.SK));
      writeMockDb(remaining);
      return;
    }

    await ddbDocClient!.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: keys.PK, SK: keys.SK }
    }));
  },

  // List sponsor metadata linked to an event
  listSponsorsByEvent: async (eventId: string): Promise<any[]> => {
    logger.info(`dbService.listSponsorsByEvent: eventId=${eventId}`);
    const eventPk = `EVENT#${eventId}`;

    const relationshipItems = DB_MODE === 'mock'
      ? readMockDb().filter(
          item =>
            item.PK === eventPk &&
            typeof item.SK === 'string' &&
            item.SK.startsWith('SPONSOR#') &&
            item.entityType === 'EVENT_SPONSOR'
        )
      : (await ddbDocClient!.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': eventPk,
            ':skPrefix': 'SPONSOR#'
          }
        }))).Items || [];

    const sponsors = [];
    for (const relationship of relationshipItems) {
      if (relationship.entityType !== 'EVENT_SPONSOR') {
        continue;
      }

      const sponsorId = relationship.sponsorId || relationship.SK?.replace('SPONSOR#', '');
      if (!sponsorId) {
        continue;
      }

      const sponsor = await dbService.getSponsorById(sponsorId);
      if (sponsor) {
        sponsors.push({
          ...sponsor,
          tier: relationship.tier || sponsor.tier || ''
        });
      }
    }

    return sponsors;
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
    let organizerId = normalizeCategory(input.organizerId);

    if (!organizerId || !(await dbService.getOrganizerById(organizerId))) {
      organizerId = DEFAULT_ORGANIZER_ID;

      if (!(await dbService.getOrganizerById(organizerId))) {
        const defaultOrganizer = DEFAULT_ORGANIZERS[0];
        await dbService.createOrganizerItem(defaultOrganizer);
      }
    }

    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'EVENT',
      eventId: input.eventId,
      organizerId,
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

  // Create or replace a materialized view item
  createMaterializedViewItem: async (input: {
    viewName: string;
    data: any;
    generatedAt?: string;
    ttl?: number;
  }): Promise<any> => {
    const now = new Date().toISOString();
    const generatedAt = input.generatedAt || now;
    const keys = buildMaterializedViewKeys(input.viewName);
    const existingView = await dbService.getItem(keys.PK, keys.SK);
    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'MATERIALIZED_VIEW',
      viewName: input.viewName,
      data: input.data,
      generatedAt,
      ttl: input.ttl || Math.floor(Date.now() / 1000) + 5 * 60,
      createdAt:
        existingView?.entityType === 'MATERIALIZED_VIEW'
          ? existingView.createdAt
          : now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Get a materialized view by name
  getMaterializedView: async (viewName: string): Promise<any | null> => {
    const keys = buildMaterializedViewKeys(viewName);
    logger.info(`dbService.getMaterializedView: viewName=${viewName}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item || (item.entityType && item.entityType !== 'MATERIALIZED_VIEW')) {
      return null;
    }

    return {
      viewName: item.viewName || viewName,
      data: item.data || [],
      generatedAt: item.generatedAt || '',
      ttl: Number(item.ttl || 0),
      createdAt: item.createdAt || '',
      updatedAt: item.updatedAt || item.createdAt || ''
    };
  },

  // Refresh the HOMEPAGE_EVENTS materialized view
  refreshHomepageView: async (): Promise<any> => {
    logger.info('dbService.refreshHomepageView');
    const events = await dbService.listEvents();
    return dbService.createMaterializedViewItem({
      viewName: 'HOMEPAGE_EVENTS',
      data: events,
      ttl: Math.floor(Date.now() / 1000) + 5 * 60
    });
  },

  // Create a simulated payment item using the PAYMENT schema
  createPaymentItem: async (input: {
    paymentId: string;
    registrationId: string;
    userId: string;
    eventId: string;
    amount?: number;
    currency?: string;
    provider?: string;
    state?: string;
    transactionId: string;
  }): Promise<any> => {
    const now = new Date().toISOString();
    const keys = buildPaymentKeys(input.registrationId, input.paymentId);
    const item = {
      PK: keys.PK,
      SK: keys.SK,
      entityType: 'PAYMENT',
      paymentId: input.paymentId,
      registrationId: input.registrationId,
      userId: input.userId,
      eventId: input.eventId,
      amount: Number(input.amount || 0),
      currency: input.currency || 'VND',
      provider: input.provider || 'MOCK',
      state: input.state || 'SUCCESS',
      transactionId: input.transactionId,
      GSI2PK: `USER#${input.userId}`,
      GSI2SK: `TXN#${input.transactionId}`,
      createdAt: now,
      updatedAt: now
    };

    await dbService.putItem(item);
    return item;
  },

  // Get payment metadata by registrationId and paymentId
  getPaymentById: async (registrationId: string, paymentId: string): Promise<any | null> => {
    const keys = buildPaymentKeys(registrationId, paymentId);
    logger.info(`dbService.getPaymentById: registrationId=${registrationId}, paymentId=${paymentId}`);

    const item = await dbService.getItem(keys.PK, keys.SK);
    if (!item) {
      return null;
    }

    if (item.entityType && item.entityType !== 'PAYMENT') {
      return null;
    }

    return mapPaymentItemToDto(item);
  },

  // List payments for a registration
  listPaymentsByRegistration: async (registrationId: string): Promise<any[]> => {
    logger.info(`dbService.listPaymentsByRegistration: registrationId=${registrationId}`);
    const registrationPk = `REG#${registrationId}`;

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      return items
        .filter(
          item =>
            item.PK === registrationPk &&
            typeof item.SK === 'string' &&
            item.SK.startsWith('PAYMENT#') &&
            item.entityType === 'PAYMENT'
        )
        .map(item => mapPaymentItemToDto(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }

    const result = await ddbDocClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': registrationPk,
        ':skPrefix': 'PAYMENT#'
      }
    }));

    return (result.Items || [])
      .filter((item: any) => item.entityType === 'PAYMENT')
      .map((item: any) => mapPaymentItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);
  },

  // List payments for a user through GSI2
  listPaymentsByUser: async (userId: string): Promise<any[]> => {
    logger.info(`dbService.listPaymentsByUser: userId=${userId}`);
    const userPk = `USER#${userId}`;

    if (DB_MODE === 'mock') {
      const items = readMockDb();
      return items
        .filter(
          item =>
            item.GSI2PK === userPk &&
            typeof item.GSI2SK === 'string' &&
            item.GSI2SK.startsWith('TXN#') &&
            item.entityType === 'PAYMENT'
        )
        .map(item => mapPaymentItemToDto(item))
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }

    const result = await ddbDocClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2Index',
      KeyConditionExpression: 'GSI2PK = :gsiPk AND begins_with(GSI2SK, :gsiSkPrefix)',
      ExpressionAttributeValues: {
        ':gsiPk': userPk,
        ':gsiSkPrefix': 'TXN#'
      }
    }));

    return (result.Items || [])
      .filter((item: any) => item.entityType === 'PAYMENT')
      .map((item: any) => mapPaymentItemToDto(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);
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
  },

  // Increment remaining seats while keeping compatibility counters updated
  incrementRemainingSeats: async (eventId: string): Promise<any | null> => {
    const keys = buildEventKeys(eventId);
    logger.info(`dbService.incrementRemainingSeats: eventId=${eventId}`);

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
    
    const nextRemainingSeats = Math.min(totalSeats, currentRemainingSeats + 1);
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

  // Increment ticket remaining quantity
  incrementTicketRemainingQuantity: async (eventId: string, ticketId: string): Promise<any | null> => {
    const keys = buildTicketKeys(eventId, ticketId);
    logger.info(`dbService.incrementTicketRemainingQuantity: eventId=${eventId}, ticketId=${ticketId}`);

    const existingTicket = await dbService.getItem(keys.PK, keys.SK);
    if (!existingTicket) {
      return null;
    }

    if (existingTicket.entityType && existingTicket.entityType !== 'TICKET') {
      return null;
    }

    const totalQuantity = Number(existingTicket.totalQuantity || 0);
    const currentRemainingQuantity = Number(existingTicket.remainingQuantity || 0);
    const updatedTicket = {
      ...existingTicket,
      remainingQuantity: Math.min(totalQuantity, currentRemainingQuantity + 1),
      updatedAt: new Date().toISOString()
    };

    await dbService.putItem(updatedTicket);
    return updatedTicket;
  },

  // Increment user loyalty points balance in database
  incrementUserLoyaltyPoints: async (userId: string, points: number): Promise<void> => {
    logger.info(`dbService.incrementUserLoyaltyPoints: userId=${userId}, points=${points}`);
    const keys = buildUserKeys(userId);
    const user = await dbService.getItem(keys.PK, keys.SK);
    if (user && user.entityType === 'USER') {
      const currentPoints = Number(user.loyaltyPoints || 0);
      user.loyaltyPoints = currentPoints + points;
      user.updatedAt = new Date().toISOString();
      await dbService.putItem(user);
    } else {
      // If user metadata item does not exist, create it first
      await dbService.createUserItem({
        userId,
        email: `${userId}@example.com`,
        role: 'User'
      });
      const updatedUser = await dbService.getItem(keys.PK, keys.SK);
      if (updatedUser) {
        updatedUser.loyaltyPoints = points;
        await dbService.putItem(updatedUser);
      }
    }
  },

  // Delete item by PK and SK
  deleteItem: async (pk: string, sk: string): Promise<void> => {
    logger.info(`dbService.deleteItem: PK=${pk}, SK=${sk}`);
    if (DB_MODE === 'mock') {
      const items = readMockDb();
      const filtered = items.filter(item => !(item.PK === pk && item.SK === sk));
      writeMockDb(filtered);
    } else {
      await ddbDocClient!.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk }
      }));
    }
  }
};
