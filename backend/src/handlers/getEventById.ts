import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventById handler triggered');
    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;

    if (!eventId) {
      return buildResponse(400, null, 'Thiáº¿u ID sá»± kiá»‡n trong yÃªu cáº§u.');
    }

    const eventData = await dbService.getEventById(eventId);

    if (!eventData) {
      return buildResponse(404, null, `KhÃ´ng tÃ¬m tháº¥y sá»± kiá»‡n vá»›i ID: ${eventId}`);
    }

    return buildResponse(200, eventData);
  } catch (error: any) {
    logger.error('Error in getEventById handler', error);
    return buildResponse(500, null, 'KhÃ´ng thá»ƒ táº£i chi tiáº¿t sá»± kiá»‡n. Vui lÃ²ng thá»­ láº¡i sau.');
  }
};
