import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildEventKeys, dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { writeAuditLogSafely } from '../utils/auditLogger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('checkinEventUser handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Admin permission required.');
    }

    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;
    const userId = pathParams.userId;

    if (!eventId || !userId) {
      return buildResponse(400, null, 'Missing event id or user id.');
    }

    const eventKeys = buildEventKeys(eventId);
    const eventItem = await dbService.getItem(eventKeys.PK, eventKeys.SK);
    if (!eventItem || (eventItem.entityType && eventItem.entityType !== 'EVENT')) {
      return buildResponse(404, null, 'Event not found.');
    }

    const registration = await dbService.getRegistrationByUserAndEvent(userId, eventId);
    if (!registration) {
      return buildResponse(404, null, 'User registration not found.');
    }

    const existingCheckin = await dbService.getCheckin(eventId, userId);
    if (existingCheckin) {
      return buildResponse(400, null, 'User already checked in');
    }

    const checkedInBy = claims?.sub || claims?.userId || claims?.email || 'admin';
    const checkin = await dbService.createCheckinItem({
      eventId,
      userId,
      registrationId: registration.registrationId || '',
      ticketId: registration.ticketId || 'GENERAL',
      checkedInBy
    });

    await writeAuditLogSafely({
      action: 'CHECKIN_EVENT',
      actorId: checkedInBy,
      actorEmail: claims?.email || '',
      resourceType: 'CHECKIN',
      resourceId: `${eventId}#${userId}`,
      details: {
        eventId,
        userId,
        registrationId: registration.registrationId || ''
      }
    });

    return buildResponse(200, {
      eventId: checkin.eventId,
      userId: checkin.userId,
      checkedInAt: checkin.checkedInAt
    });
  } catch (error: any) {
    logger.error('Error in checkinEventUser handler', error);
    return buildResponse(500, null, 'Unable to check in user. Please try again later.');
  }
};
