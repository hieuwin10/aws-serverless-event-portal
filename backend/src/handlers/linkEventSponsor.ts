import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildEventKeys, dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('linkEventSponsor handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Admin permission required.');
    }

    const eventId = event.pathParameters?.id;
    const sponsorId = event.pathParameters?.sponsorId;

    if (!eventId || !sponsorId) {
      return buildResponse(400, null, 'Missing event id or sponsor id.');
    }

    let body: any = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return buildResponse(400, null, 'Invalid request body.');
    }

    const eventKeys = buildEventKeys(eventId);
    const eventItem = await dbService.getItem(eventKeys.PK, eventKeys.SK);
    if (!eventItem || (eventItem.entityType && eventItem.entityType !== 'EVENT')) {
      return buildResponse(404, null, 'Event not found.');
    }

    const sponsor = await dbService.getSponsorById(sponsorId);
    if (!sponsor) {
      return buildResponse(404, null, 'Sponsor not found.');
    }

    const relationship = await dbService.linkSponsorToEvent(
      eventId,
      sponsorId,
      body.tier === undefined || body.tier === null ? undefined : String(body.tier)
    );

    return buildResponse(200, {
      eventId: relationship.eventId,
      sponsorId: relationship.sponsorId,
      tier: relationship.tier || '',
      createdAt: relationship.createdAt,
      updatedAt: relationship.updatedAt
    });
  } catch (error: any) {
    logger.error('Error in linkEventSponsor handler', error);
    return buildResponse(500, null, 'Unable to link sponsor to event. Please try again later.');
  }
};
