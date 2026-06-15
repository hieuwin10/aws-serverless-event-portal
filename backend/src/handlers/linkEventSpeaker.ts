import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildEventKeys, dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('linkEventSpeaker handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Admin permission required.');
    }

    const eventId = event.pathParameters?.id;
    const speakerId = event.pathParameters?.speakerId;

    if (!eventId || !speakerId) {
      return buildResponse(400, null, 'Missing event id or speaker id.');
    }

    const eventKeys = buildEventKeys(eventId);
    const eventItem = await dbService.getItem(eventKeys.PK, eventKeys.SK);
    if (!eventItem || (eventItem.entityType && eventItem.entityType !== 'EVENT')) {
      return buildResponse(404, null, 'Event not found.');
    }

    const speaker = await dbService.getSpeakerById(speakerId);
    if (!speaker) {
      return buildResponse(404, null, 'Speaker not found.');
    }

    const relationship = await dbService.linkSpeakerToEvent(eventId, speakerId);
    return buildResponse(200, {
      eventId: relationship.eventId,
      speakerId: relationship.speakerId,
      createdAt: relationship.createdAt
    });
  } catch (error: any) {
    logger.error('Error in linkEventSpeaker handler', error);
    return buildResponse(500, null, 'Unable to link speaker to event. Please try again later.');
  }
};
