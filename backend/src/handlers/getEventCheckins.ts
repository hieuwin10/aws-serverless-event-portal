import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventCheckins handler triggered');
    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;

    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    const checkins = await dbService.listCheckinsByEvent(eventId);
    return buildResponse(200, checkins);
  } catch (error: any) {
    logger.error('Error in getEventCheckins handler', error);
    return buildResponse(500, null, 'Unable to load checkins. Please try again later.');
  }
};
