import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildEventKeys, dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventSponsors handler triggered');

    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    const eventKeys = buildEventKeys(eventId);
    const eventItem = await dbService.getItem(eventKeys.PK, eventKeys.SK);
    if (!eventItem || (eventItem.entityType && eventItem.entityType !== 'EVENT')) {
      return buildResponse(404, null, 'Event not found.');
    }

    const sponsors = await dbService.listSponsorsByEvent(eventId);
    return buildResponse(200, sponsors);
  } catch (error: any) {
    logger.error('Error in getEventSponsors handler', error);
    return buildResponse(500, null, 'Unable to load event sponsors. Please try again later.');
  }
};
